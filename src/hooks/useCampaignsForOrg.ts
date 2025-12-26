// src/hooks/useCampaignsForOrg.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

/**
 * מחזיר רק קמפיינים של ארגון מסוים — או את כולם אם זה super_admin
 * מיועד לשימוש ב־Dropdownים או טפסים ולא לטבלה הראשית
 */
export function useCampaignsForOrg() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["campaigns-for-org", organizationId],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      // 🟦 super_admin רואה את כל הקמפיינים
      if (isGlobalSuperAdmin) {
        return (await query).data || [];
      }

      // 🟩 משתמש רגיל — מסנן לפי org
      if (organizationId && organizationId !== "all") {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });
}
