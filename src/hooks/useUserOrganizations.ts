// src/hooks/useUserOrganizations.ts

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type UserOrganization = {
  organization_id: string;
  role: string;
  created_at: string;
};

export async function fetchUserOrganizations() {
  // 1️⃣ קבלת המשתמש המחובר
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User not logged in");

  // 2️⃣ טעינת הארגונים אליהם המשתמש משויך
  const { data, error } = await supabase
    .from("user_organizations")
    .select("organization_id, role, created_at")
    .eq("user_id", user.id);

  if (error) throw error;

  return (data || []) as UserOrganization[];
}

export function useUserOrganizations() {
  return useQuery({
    queryKey: ["user_organizations"],
    queryFn: fetchUserOrganizations,
  });
}
