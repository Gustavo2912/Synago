import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HomePageContent,
  makeDefaultHomeContent,
  LocalizedText,
} from "./home.types";
import { useUser } from "@/contexts/UserContext";

type SaveState = {
  status: "idle" | "saving" | "success" | "error";
  error?: string;
};

type PageData = {
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
};

export function useHomePage() {
  const {
    organizationId,
    user,
    userLoading,
    isGlobalSuperAdmin,
    permissions,
  } = useUser();

  /* ----------------------------------------------------------
     MODE
  ---------------------------------------------------------- */

  const isEditingGlobal =
    isGlobalSuperAdmin && organizationId === "all";

  const orgId =
    organizationId && organizationId !== "all"
      ? organizationId
      : null;

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */

  const [loading, setLoading] = useState(true);

  // raw data
  const [globalPage, setGlobalPage] = useState<PageData | null>(null);
  const [orgPage, setOrgPage] = useState<PageData | null>(null);

  // derived
  const hasOrgPage = !!orgPage;
  const previewSource: "org" | "global" = hasOrgPage ? "org" : "global";

  const effectivePage: PageData | null =
    isEditingGlobal
      ? globalPage
      : hasOrgPage
      ? orgPage
      : globalPage;

  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  /* ----------------------------------------------------------
     LOAD
  ---------------------------------------------------------- */
  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      /* ---------- GLOBAL ---------- */
      const { data: g } = await supabase
        .from("organization_home_pages")
        .select("*")
        .eq("is_global", true)
        .maybeSingle();

      if (!g) {
        console.error("❌ Global Home Page missing");
        setLoading(false);
        return;
      }

      const globalData: PageData = {
        title: g.title ?? {},
        heroImage: g.hero_image_url ?? null,
        content: g.content ?? makeDefaultHomeContent(),
      };

      if (!cancelled) setGlobalPage(globalData);

      /* ---------- ORG ---------- */
      if (orgId) {
        const { data: o } = await supabase
          .from("organization_home_pages")
          .select("*")
          .eq("organization_id", orgId)
          .maybeSingle();

        if (!cancelled) {
          if (o) {
            setOrgPage({
              title: o.title ?? {},
              heroImage: o.hero_image_url ?? null,
              content: o.content ?? makeDefaultHomeContent(),
            });
          } else {
            setOrgPage(null);
          }
        }
      } else {
        setOrgPage(null);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, userLoading, orgId, isEditingGlobal]);

  /* ----------------------------------------------------------
     SAVE (ONLY ORG OR GLOBAL EDIT)
  ---------------------------------------------------------- */
  const save = useCallback(async () => {
    if (!user) return;
    if (!effectivePage) return;
    if (!isEditingGlobal && !hasOrgPage) return;

    setSaveState({ status: "saving" });

    const payload = {
      title: effectivePage.title,
      hero_image_url: effectivePage.heroImage,
      content: effectivePage.content,
      updated_by: user.id,
    };

    const query = isEditingGlobal
      ? supabase
          .from("organization_home_pages")
          .update(payload)
          .eq("is_global", true)
      : supabase
          .from("organization_home_pages")
          .update(payload)
          .eq("organization_id", orgId!);

    const { error } = await query;

    if (error) {
      console.error("❌ Save failed:", error);
      setSaveState({ status: "error", error: error.message });
    } else {
      setSaveState({ status: "success" });
      setTimeout(() => setSaveState({ status: "idle" }), 1200);
    }
  }, [effectivePage, isEditingGlobal, hasOrgPage, orgId, user]);

  /* ----------------------------------------------------------
     CLONE
  ---------------------------------------------------------- */
  const cloneFromGlobal = useCallback(async () => {
    if (!orgId || hasOrgPage || !user || !globalPage) return;

    const { error } = await supabase
      .from("organization_home_pages")
      .insert({
        organization_id: orgId,
        is_global: false,
        title: globalPage.title,
        hero_image_url: globalPage.heroImage,
        content: globalPage.content,
        updated_by: user.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setOrgPage(globalPage);
  }, [orgId, hasOrgPage, user, globalPage]);

  /* ----------------------------------------------------------
     PERMISSIONS
  ---------------------------------------------------------- */

  const canEdit =
    permissions["manage_home_page"] === true &&
    (isEditingGlobal || hasOrgPage);

  const canClone =
    permissions["manage_home_page"] === true &&
    !!orgId &&
    !hasOrgPage;

  const isViewOnly = !canEdit;

  /* ----------------------------------------------------------
     EXPOSE EFFECTIVE PAGE ONLY
  ---------------------------------------------------------- */

  return {
    loading,

    title: effectivePage?.title ?? {},
    setTitle: (v: LocalizedText) => {
      if (!effectivePage) return;
      if (isEditingGlobal) {
        setGlobalPage({ ...globalPage!, title: v });
      } else if (hasOrgPage) {
        setOrgPage({ ...orgPage!, title: v });
      }
    },

    heroImage: effectivePage?.heroImage ?? null,
    setHeroImage: (v: string | null) => {
      if (!effectivePage) return;
      if (isEditingGlobal) {
        setGlobalPage({ ...globalPage!, heroImage: v });
      } else if (hasOrgPage) {
        setOrgPage({ ...orgPage!, heroImage: v });
      }
    },

    content: effectivePage?.content ?? makeDefaultHomeContent(),
    setContent: (v: HomePageContent) => {
      if (!effectivePage) return;
      if (isEditingGlobal) {
        setGlobalPage({ ...globalPage!, content: v });
      } else if (hasOrgPage) {
        setOrgPage({ ...orgPage!, content: v });
      }
    },

    save,
    saveState,
    cloneFromGlobal,

    hasOrgPage,
    previewSource,
    canEdit,
    canClone,
    isViewOnly,

    isEditingGlobal,
    orgId,
  };
}
