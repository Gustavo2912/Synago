// src/hooks/useOrgSettings.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function useOrgSettings(orgIdOverride?: string) {
  const { organizationId } = useUser();
  const orgId = orgIdOverride ?? organizationId;

  return useQuery({
    queryKey: ["org_settings", orgId],
    enabled: !!orgId && orgId !== "all",

    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) throw error;

      return {
        default_currency: data?.default_currency || "USD",
        surcharge_enabled: data?.surcharge_enabled || false,
        surcharge_percent: Number(data?.surcharge_percent) || 0,
        surcharge_fixed: Number(data?.surcharge_fixed) || 0,
        receipt_format: data?.receipt_format || "BN-{YEAR}-{SEQUENCE}",
        zelle_name: data?.zelle_name || "",
        zelle_email_or_phone: data?.zelle_email_or_phone || "",
        zelle_note: data?.zelle_note || "",
      };
    },
  });
}
