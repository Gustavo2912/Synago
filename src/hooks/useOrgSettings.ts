// src/hooks/useOrgSettings.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function useOrgSettings() {
  const { organizationId } = useUser();

  return useQuery({
    queryKey: ["org-settings", organizationId],
    enabled: !!organizationId && organizationId !== "all",

    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;

      return {
        defaultCurrency: data?.default_currency || "ILS",
        surchargeEnabled: data?.surcharge_enabled || false,
        surchargePercent: Number(data?.surcharge_percent) || 0,
        surchargeFixed: Number(data?.surcharge_fixed) || 0,
        receiptFormat: data?.receipt_format || "BN-{YEAR}-{SEQUENCE}",
        zelleName: data?.zelle_name || "",
        zelleEmailOrPhone: data?.zelle_email_or_phone || "",
        zelleNote: data?.zelle_note || "",
      };
    },
  });
}
