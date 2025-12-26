// src/hooks/useActiveOrganization.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveOrganization(organizationId?: string | null) {
  return useQuery({
    enabled: !!organizationId && organizationId !== "all",
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, subscription_status")
        .eq("id", organizationId!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
