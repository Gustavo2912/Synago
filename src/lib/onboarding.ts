import { supabase } from "@/integrations/supabase/client";

export async function runOnboarding(userId: string, email: string) {
  // שלב 1 — בדוק אם כבר יש profile
  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfile?.organization_id) {
    // כבר הושלם onboarding
    return existingProfile;
  }

  // שלב 2 — צור ארגון חדש (אם משתמש ראשון)
  const { data: count } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  const isFirstUser = (count?.count || 0) === 0;

  let organizationId = null;

  if (isFirstUser) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: "New Synagogue",
        created_by_user_id: userId,
      })
      .select()
      .single();

    if (orgError) throw orgError;
    organizationId = org.id;
  }

  // שלב 3 — צור או עדכן פרופיל
  const role = isFirstUser ? "synagogue_admin" : "member";

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,
      email,
      role,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (updateError) throw updateError;

  // שלב 4 — עדכן user_organizations
  if (organizationId) {
    await supabase.from("user_organizations").insert({
      user_id: userId,
      organization_id: organizationId,
      role,
    });
  }

  return profile;
}
