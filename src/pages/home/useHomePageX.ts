import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HomePageContent, makeDefaultHomeContent, LocalizedText } from "./home.types";
import { useUser } from "@/contexts/UserContext";

type SaveState = {
  status: "idle" | "saving" | "success" | "error";
  error?: string;
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
     MODE RESOLUTION (FIXED)
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

  const [title, setTitle] = useState<LocalizedText>({});
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [content, setContent] = useState<HomePageContent>(
    makeDefaultHomeContent()
  );

  const [hasOrgPage, setHasOrgPage] = useState(false);
  const [previewSource, setPreviewSource] = useState<"org" | "global">("org");

  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  /* ----------------------------------------------------------
     LOAD HOME PAGE (FIXED LOGIC)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      /* ---------- LOAD GLOBAL ---------- */
      const { data: globalPage } = await supabase
        .from("organization_home_pages")
        .select("*")
        .eq("is_global", true)
        .maybeSingle();

      if (!globalPage) {
        console.error("❌ Global Home Page missing");
        setLoading(false);
        return;
      }

      /* ---------- GLOBAL EDIT MODE ---------- */
      if (isEditingGlobal) {
        if (cancelled) return;

        setHasOrgPage(true);
        setPreviewSource("org");

        setTitle(globalPage.title ?? {});
        setHeroImage(globalPage.hero_image_url);
        setContent(globalPage.content ?? makeDefaultHomeContent());

        setLoading(false);
        return;
      }

      /* ---------- ORG MODE (INCLUDING super_admin!) ---------- */
      if (orgId) {
        const { data: orgPage } = await supabase
          .from("organization_home_pages")
          .select("*")
          .eq("organization_id", orgId)
          .maybeSingle();

        if (cancelled) return;

        if (orgPage) {
          // ✅ THIS IS THE FIX
          setHasOrgPage(true);
          setPreviewSource("org");

          setTitle(orgPage.title ?? {});
          setHeroImage(orgPage.hero_image_url);
          setContent(orgPage.content ?? makeDefaultHomeContent());
        } else {
          // ❌ No org page → template only
          setHasOrgPage(false);
          setPreviewSource("global");

          setTitle({});
          setHeroImage(null);
          setContent(makeDefaultHomeContent());
        }

        setLoading(false);
        return;
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, userLoading, isEditingGlobal, orgId]);

  /* ----------------------------------------------------------
     SAVE
  ---------------------------------------------------------- */
  const save = useCallback(async () => {
    if (!user) return;

    if (!isEditingGlobal && !hasOrgPage) return;

    setSaveState({ status: "saving" });

    const payload = {
      title,
      hero_image_url: heroImage,
      content,
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
      setTimeout(() => setSaveState({ status: "idle" }), 1500);
    }
  }, [isEditingGlobal, hasOrgPage, orgId, title, heroImage, content, user]);

  /* ----------------------------------------------------------
     CLONE
  ---------------------------------------------------------- */
  const cloneFromGlobal = useCallback(async () => {
    if (!orgId || hasOrgPage || !user) return;

    const { data: globalPage } = await supabase
      .from("organization_home_pages")
      .select("*")
      .eq("is_global", true)
      .maybeSingle();

    if (!globalPage) return;

    const { error } = await supabase
      .from("organization_home_pages")
      .insert({
        organization_id: orgId,
        is_global: false,
        title: globalPage.title,
        hero_image_url: globalPage.hero_image_url,
        content: globalPage.content,
        updated_by: user.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setHasOrgPage(true);
    setPreviewSource("org");

    setTitle(globalPage.title ?? {});
    setHeroImage(globalPage.hero_image_url);
    setContent(globalPage.content ?? makeDefaultHomeContent());
  }, [orgId, hasOrgPage, user]);

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

  return {
    loading,

    title,
    setTitle,
    heroImage,
    setHeroImage,
    content,
    setContent,

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
