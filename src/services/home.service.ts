// src/services/home.service.ts
import { supabase } from "@/integrations/supabase/client";
import { LocalizedText, HomePageContent } from "@/pages/home/home.types";

/* ---------- FETCH GLOBAL ---------- */
export async function fetchGlobalHomePage() {
  const { data, error } = await supabase
    .from("organization_home_pages")
    .select("*")
    .eq("is_global", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/* ---------- FETCH ORG ---------- */
export async function fetchOrgHomePage(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_home_pages")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/* ---------- FETCH EFFECTIVE (ORG → GLOBAL) ---------- */
export async function fetchEffectiveHomePage(organizationId: string | null) {
  if (organizationId) {
    const org = await fetchOrgHomePage(organizationId);
    if (org) return org;
  }
  return fetchGlobalHomePage();
}

/* ---------- SAVE GLOBAL ---------- */
export async function saveGlobalHomePage(payload: {
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
  userId: string;
}) {
  const existing = await fetchGlobalHomePage();

  if (existing) {
    const { error } = await supabase
      .from("organization_home_pages")
      .update({
        title: payload.title,
        hero_image_url: payload.heroImage,
        content: payload.content,
        updated_by: payload.userId,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("organization_home_pages").insert({
      is_global: true,
      organization_id: null,
      title: payload.title,
      hero_image_url: payload.heroImage,
      content: payload.content,
      updated_by: payload.userId,
    });

    if (error) throw error;
  }
}

/* ---------- SAVE ORG ---------- */
export async function saveOrgHomePage(payload: {
  organizationId: string;
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
  userId: string;
}) {
  const existing = await fetchOrgHomePage(payload.organizationId);

  if (existing) {
    const { error } = await supabase
      .from("organization_home_pages")
      .update({
        title: payload.title,
        hero_image_url: payload.heroImage,
        content: payload.content,
        updated_by: payload.userId,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("organization_home_pages").insert({
      is_global: false,
      organization_id: payload.organizationId,
      title: payload.title,
      hero_image_url: payload.heroImage,
      content: payload.content,
      updated_by: payload.userId,
    });

    if (error) throw error;
  }
}

/* ---------- CLONE GLOBAL → ORG ---------- */
export async function cloneGlobalHomeToOrg(params: {
  organizationId: string;
  userId: string;
}) {
  const global = await fetchGlobalHomePage();
  if (!global) throw new Error("Global home page not found");

  const existingOrg = await fetchOrgHomePage(params.organizationId);
  if (existingOrg) throw new Error("Organization already has a home page");

  const { error } = await supabase.from("organization_home_pages").insert({
    is_global: false,
    organization_id: params.organizationId,
    title: global.title,
    hero_image_url: global.hero_image_url,
    content: global.content,
    updated_by: params.userId,
  });

  if (error) throw error;
}
