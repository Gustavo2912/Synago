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
     MODE
---------------------------------------------------------- */
  const isGlobalMode = isGlobalSuperAdmin && organizationId === "all";

  const orgId =
    !isGlobalMode && organizationId && organizationId !== "all"
      ? organizationId
      : null;

  /* ----------------------------------------------------------
     PERMISSIONS (🔐 SOURCE OF TRUTH)
---------------------------------------------------------- */
  const canManageHomePage = !!permissions.manage_home_page;
  const canViewHomePage =
    !!permissions.view_home_page || canManageHomePage;

  const canEdit =
    (isGlobalMode && isGlobalSuperAdmin) ||
    (!!orgId && canManageHomePage);

  const isViewOnly = canViewHomePage && !canEdit;

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
  const [isUsingGlobalFallback, setIsUsingGlobalFallback] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  /* ----------------------------------------------------------
     LOAD HOME PAGE
---------------------------------------------------------- */
  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      /* ---------- LOAD GLOBAL ---------- */
      const { data: globalPage, error: globalError } = await supabase
        .from("organization_home_pages")
        .select("*")
        .eq("is_global", true)
        .maybeSingle();

      if (globalError || !globalPage) {
        console.error("❌ Global Home Page missing", globalError);
        setLoading(false);
        return;
      }

      /* ---------- GLOBAL MODE ---------- */
      if (isGlobalMode) {
        if (cancelled) return;

        setHasOrgPage(true);
        setIsUsingGlobalFallback(false);

        setTitle(globalPage.title ?? {});
        setHeroImage(globalPage.hero_image_url);
        setContent(globalPage.content ?? makeDefaultHomeContent());

        setLoading(false);
        return;
      }

      /* ---------- ORG MODE ---------- */
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data: orgPage } = await supabase
        .from("organization_home_pages")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (cancelled) return;

      if (orgPage) {
        setHasOrgPage(true);
        setIsUsingGlobalFallback(false);

        setTitle(orgPage.title ?? {});
        setHeroImage(orgPage.hero_image_url);
        setContent(orgPage.content ?? makeDefaultHomeContent());
      } else {
        // fallback to global
        setHasOrgPage(false);
        setIsUsingGlobalFallback(true);

        setTitle(globalPage.title ?? {});
        setHeroImage(globalPage.hero_image_url);
        setContent(globalPage.content ?? makeDefaultHomeContent());
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, userLoading, isGlobalMode, orgId]);

  /* ----------------------------------------------------------
     SAVE
---------------------------------------------------------- */
  const save = useCallback(async () => {
    if (!canEdit) return;
    if (isUsingGlobalFallback) return;

    setSaveState({ status: "saving" });

    const payload = {
      title,
      hero_image_url: heroImage,
      content,
      updated_by: user?.id ?? null,
    };

    const query = isGlobalMode
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
  }, [
    canEdit,
    isUsingGlobalFallback,
    isGlobalMode,
    orgId,
    title,
    heroImage,
    content,
    user,
  ]);

  /* ----------------------------------------------------------
     CLONE GLOBAL → ORG
---------------------------------------------------------- */
  const cloneFromGlobal = useCallback(async () => {
    if (!orgId || hasOrgPage || !canEdit) return;

    const { data: globalPage } = await supabase
      .from("organization_home_pages")
      .select("*")
      .eq("is_global", true)
      .maybeSingle();

    if (!globalPage) {
      alert("Global Home Page not found");
      return;
    }

    const { error } = await supabase
      .from("organization_home_pages")
      .insert({
        organization_id: orgId,
        is_global: false,
        title: globalPage.title,
        hero_image_url: globalPage.hero_image_url,
        content: globalPage.content,
        updated_by: user?.id ?? null,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setHasOrgPage(true);
    setIsUsingGlobalFallback(false);
  }, [orgId, hasOrgPage, canEdit, user]);

  /* ----------------------------------------------------------
     PUBLIC API
---------------------------------------------------------- */
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
    isUsingGlobalFallback,

    canEdit,
    canClone: canEdit && !!orgId && !hasOrgPage,
    isViewOnly,

    isGlobalMode,
    orgId,
  };
}
