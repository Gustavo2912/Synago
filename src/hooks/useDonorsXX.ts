// src/hooks/useDonors.ts
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

export type Donor = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;

  organizations: { id: string; name: string | null }[];
  donations: any[];

  total_donations: number;
  last_donation_amount: number | null;
  last_donation_date: string | null;
};

type UseDonorsArgs = {
  search?: string;
  organizationId?: string | null;
};

export function useDonors({ search = "", organizationId }: UseDonorsArgs) {
  const { isGlobalSuperAdmin } = useUser();

  return useQuery<Donor[]>({
    queryKey: ["donors", organizationId, search, isGlobalSuperAdmin],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase
        .from("donors")
        .select(
          `
            *,
            donor_organizations (
              organization_id,
              organizations (
                id,
                name
              )
            ),
            donations (
              id,
              amount,
              date,
              organization_id
            )
          `
        );

      // SUPER ADMIN → ALL ORGS
      if (isGlobalSuperAdmin && organizationId === "all") {
        // no filter
      }

      // SPECIFIC ORG (super admin or regular user)
      else if (organizationId) {
        query = query.eq("donor_organizations.organization_id", organizationId);
      }

      // FREE TEXT SEARCH
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

      return donors.map((d) => {
        const organizations =
          d.donor_organizations?.map((x: any) => x.organizations).filter(Boolean) ||
          [];

        const relevantDonations =
          organizationId === "all"
            ? d.donations
            : d.donations?.filter((don: any) => don.organization_id === organizationId) ?? [];

        const total_donations = relevantDonations.reduce(
          (sum: number, x: any) => sum + Number(x.amount || 0),
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
          total_donations,
          last_donation_amount: last?.amount ?? null,
          last_donation_date: last?.date ?? null,
        };
      });
    },
  });
}
