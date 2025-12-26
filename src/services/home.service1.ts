import { supabase } from "@/integrations/supabase/client";
import { HomeBlock, LocalizedText } from "@/pages/home/home.types";

/* -------------------------------------------------- */
/* fetch                                               */
/* -------------------------------------------------- */

export async function fetchGlobalHomePage() {
  const { data, error } = await supabase
    .from("organization_home_pages")
    .select("*")
    .eq("is_global", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchOrgHomePage(organizationId: string) {
  const { data, error } = await supabase
    .from("organization_home_pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_global", false)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchEffectiveHomePage(
  organizationId: string | null
) {
  if (organizationId) {
    const org = await fetchOrgHomePage(organizationId);
    if (org) return org;
  }
  return fetchGlobalHomePage();
}

/* -------------------------------------------------- */
/* save – GLOBAL                                       */
/* -------------------------------------------------- */

export async function saveGlobalHomePage(payload: {
  title: LocalizedText;
  heroImage: string | null;
  content: HomeBlock[];
  userId: string;
}) {
  const { error } = await supabase
    .from("organization_home_pages")
    .upsert(
      {
        is_global: true,
        organization_id: null,
        title: payload.title,
        hero_image_url: payload.heroImage,
        content: payload.content,
        updated_by: payload.userId,
      },
      {
        onConflict: "is_global",
      }
    );

  if (error) throw error;
}

/* -------------------------------------------------- */
/* save – ORG (UPSERT – חשוב!)                         */
/* -------------------------------------------------- */

export async function saveOrgHomePage(payload: {
  organizationId: string;
  title: LocalizedText;
  heroImage: string | null;
  content: HomeBlock[];
  userId: string;
}) {
  const { error } = await supabase
    .from("organization_home_pages")
    .upsert(
      {
        is_global: false,
        organization_id: payload.organizationId,
        title: payload.title,
        hero_image_url: payload.heroImage,
        content: payload.content,
        updated_by: payload.userId,
      },
      {
        onConflict: "organization_id",
      }
    );

  if (error) throw error;
}

/* -------------------------------------------------- */
/* clone GLOBAL → ORG                                  */
/* -------------------------------------------------- */

export async function cloneGlobalHomeToOrg(params: {
  organizationId: string;
  userId: string;
}) {
  const global = await fetchGlobalHomePage();
  if (!global) throw new Error("Global home page not found");

  const { error } = await supabase
    .from("organization_home_pages")
    .upsert(
      {
        is_global: false,
        organization_id: params.organizationId,
        title: global.title,
        hero_image_url: global.hero_image_url,
        content: global.content,
        updated_by: params.userId,
      },
      {
        onConflict: "organization_id",
      }
    );

  if (error) throw error;
}
