// src/hooks/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardData(organizationId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-data", organizationId],

    queryFn: async () => {
      if (!organizationId) {
        return { donors: [], donations: [], pledges: [], payments: [] };
      }

      /* --------------------------------------------
         DONORS (דרך donor_organizations)
      --------------------------------------------- */
      const { data: donorsRaw, error: donorsError } = await supabase
        .from("donors")
        .select(
          `
            id,
            display_name,
            first_name,
            last_name,
            email,
            phone,
            created_at,
            donor_organizations ( organization_id )
          `
        );

      if (donorsError) throw donorsError;

      const donors =
        donorsRaw?.filter((d: any) =>
          d.donor_organizations?.some(
            (x: any) => x.organization_id === organizationId
          )
        ) ?? [];

      /* --------------------------------------------
         DONATIONS
      --------------------------------------------- */
      const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select(
          `
          *,
          donor:donor_id (
            id,
            first_name,
            last_name,
            display_name,
            email
          ),
          campaign:campaign_id (
            id,
            name
          )
        `
        )
        .eq("organization_id", organizationId);

      if (donationsError) throw donationsError;

      /* --------------------------------------------
         PLEDGES
      --------------------------------------------- */
      const { data: pledges, error: pledgesError } = await supabase
        .from("pledges")
        .select(
          `
          *,
          donor:donor_id (
            id,
            first_name,
            last_name,
            display_name,
            email
          ),
          campaign:campaign_id (
            id,
            name
          )
        `
        )
        .eq("organization_id", organizationId);

      if (pledgesError) throw pledgesError;

      /* --------------------------------------------
         PAYMENTS
      --------------------------------------------- */
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          *,
          donor:donor_id (
            id,
            first_name,
            last_name,
            display_name
          ),
          pledge:pledge_id (
            id,
            total_amount
          )
        `
        )
        .eq("organization_id", organizationId);

      if (paymentsError) throw paymentsError;

      return { donors, donations, pledges, payments };
    },

    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
