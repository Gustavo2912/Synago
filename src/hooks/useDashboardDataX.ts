// src/hooks/useDashboardData.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/*
  מחזיר:
  donors[]
  donations[]
  pledges[]
  payments[]
*/

export function useDashboardData(organizationId?: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        // ארגון לא נטען עדיין
        return {
          donors: [],
          donations: [],
          pledges: [],
          payments: [],
        };
      }

      // -----------------------------
      // LOAD DONORS (WITH RELATION)
      // -----------------------------
      const { data: donorsRaw, error: donorsErr } = await supabase
        .from("donors")
        .select(`
          *,
          donor_organizations (
            organization: organizations ( id )
          )
        `);

      if (donorsErr) {
        console.error("Failed loading donors:", donorsErr);
      }

      // FLATTEN + FILTER BY ORG
      const donors =
        donorsRaw?.filter((d) =>
          d.donor_organizations?.some(
            (o: any) => o.organization?.id === organizationId
          )
        ) ?? [];

      // -----------------------------
      // LOAD DONATIONS
      // -----------------------------
      const { data: donations, error: donationsErr } = await supabase
        .from("donations")
        .select("*")
        .eq("organization_id", organizationId);

      if (donationsErr) console.error("Failed loading donations:", donationsErr);

      // -----------------------------
      // LOAD PLEDGES
      // -----------------------------
      const { data: pledges, error: pledgesErr } = await supabase
        .from("pledges")
        .select("*")
        .eq("organization_id", organizationId);

      if (pledgesErr) console.error("Failed loading pledges:", pledgesErr);

      // -----------------------------
      // LOAD PAYMENTS
      // -----------------------------
      const { data: payments, error: paymentsErr } = await supabase
        .from("payments")
        .select("*")
        .eq("organization_id", organizationId);

      if (paymentsErr) console.error("Failed loading payments:", paymentsErr);

      return {
        donors,
        donations: donations ?? [],
        pledges: pledges ?? [],
        payments: payments ?? [],
      };
    },
  });

  return {
    donors: data?.donors ?? [],
    donations: data?.donations ?? [],
    pledges: data?.pledges ?? [],
    payments: data?.payments ?? [],
    loading: isLoading,
  };
}
