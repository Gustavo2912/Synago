// src/hooks/useScholarPlans.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function useScholarPlans(orgId: string | null) {
  const { isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["scholar_plans", orgId],
    enabled: !!orgId && orgId !== "all",

    queryFn: async () => {
      // don't fetch anything in "all" mode
      if (!orgId || orgId === "all") return [];

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
