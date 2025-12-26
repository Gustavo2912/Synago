// src/hooks/useCampaignsForOrg.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

// מחזיר את כל הקמפיינים של הארגון המחובר
export function useCampaignsForOrg() {
  const { organizationId } = useUser();

  return useQuery({
    queryKey: ["campaigns", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
}
