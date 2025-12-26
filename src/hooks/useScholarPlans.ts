// src/hooks/useScholarPlans.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScholarPlans(orgId: string | null) {
  return useQuery({
    queryKey: ["scholar-plans", orgId],
    enabled: !!orgId && orgId !== "all",

    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_scholar_plans")
        .select("*")
        .eq("organization_id", orgId)
        .order("amount", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
