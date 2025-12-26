// src/hooks/useDonors.ts
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

export function useDonors({ search = "", organizationId }) {
  const { isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["donors", organizationId, search, isGlobalSuperAdmin],
    enabled: !!organizationId,

    queryFn: async () => {
      let query;

      // =========================================================================
      // SUPER ADMIN — ALL ORGANIZATIONS
      // =========================================================================
      if (isGlobalSuperAdmin && organizationId === "all") {
        query = supabase
          .from("donors")
          .select(`
            *,
            donor_organizations(
              organization_id,
              organizations(id, name)
            ),
            donations(
              id,
              amount,
              date,
              payment_method,
              notes,
              organization_id,
              donor:donor_id(
                id, first_name, last_name, display_name, email, phone
              )
            )
          `);
      }

      // =========================================================================
      // SPECIFIC ORGANIZATION (super admin or regular user)
      // =========================================================================
      else {
        query = supabase
          .from("donors")
          .select(`
            *,
            donor_organizations!inner(
              organization_id,
              organizations(id, name)
            ),
            donations(
              id,
              amount,
              date,
              payment_method,
              notes,
              organization_id,
              donor:donor_id(
                id, first_name, last_name, display_name, email, phone
              )
            )
          `)
          .eq("donor_organizations.organization_id", organizationId);
      }

      // =========================================================================
      // SEARCH FILTER
      // =========================================================================
      if (search) {
        query = query.or(
          [
            `first_name.ilike.%${search}%`,
            `last_name.ilike.%${search}%`,
            `display_name.ilike.%${search}%`,
            `email.ilike.%${search}%`,
            `phone.ilike.%${search}%`,
          ].join(",")
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const donors = data || [];

      // =========================================================================
      // NORMALIZATION
      // =========================================================================
      return donors.map((d) => {
        const organizations =
          d.donor_organizations?.map((x) => x.organizations).filter(Boolean) || [];

        const relevantDonations =
          organizationId === "all"
            ? d.donations
            : d.donations?.filter((x) => x.organization_id === organizationId);

        const total = relevantDonations.reduce(
          (s, x) => s + Number(x.amount || 0),
          0
        );

        const last = [...relevantDonations].sort(
          (a, b) =>
            new Date(b.date || "").getTime() -
            new Date(a.date || "").getTime()
        )[0];

        return {
          ...d,
          organizations,
          total_donations: total,
          last_donation_amount: last?.amount ?? null,
          last_donation_date: last?.date ?? null,
        };
      });
    },
  });
}
