// src/hooks/useDonations.ts
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
export type Donation = {
  id: string;
  donor_id: string;
  organization_id: string | null;
  campaign_id: string | null;

  amount: number;
  currency: string | null;

  date: string | null;
  notes: string | null;
  payment_method: string | null;

  yahrzeit_id: string | null;
  category: string | null; // "yahrzeit" | null

  donor?: any;
  organization?: any;
  campaign?: any;

  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;

  campaign_name?: string | null;
  organization_name?: string | null;
};

/* -------------------------------------------------------
   FIXED SELECT
------------------------------------------------------- */
const DONATION_SELECT = `
  *,
  donor:donor_id (
    id, first_name, last_name, display_name, email, phone
  ),
  organization:organization_id (
    id, name
  ),
  campaign:campaign_id (
    id, name
  )
`;

/* -------------------------------------------------------
   FETCH ALL DONATIONS (ORG or GLOBAL)
------------------------------------------------------- */
export function useAllDonations(filters: any = {}, orgOverride?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const org = orgOverride ?? organizationId;

  return useQuery({
    queryKey: ["donations", org, filters],
    enabled: !!org,

    queryFn: async (): Promise<Donation[]> => {
      let query = supabase
        .from("donations")
        .select(DONATION_SELECT)
        .order("date", { ascending: false });

      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", org);
      } else {
        if (org !== "all") query = query.eq("organization_id", org);
      }

      if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters.dateTo) query = query.lte("date", filters.dateTo);

      if (filters.minAmount)
        query = query.gte("amount", Number(filters.minAmount));

      if (filters.maxAmount)
        query = query.lte("amount", Number(filters.maxAmount));

      if (filters.method && filters.method !== "__all__")
        query = query.eq("payment_method", filters.method);

      if (filters.campaign && filters.campaign !== "__all__")
        query = query.eq("campaign_id", filters.campaign);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        donor_name:
          d.donor?.display_name ||
          `${d.donor?.first_name ?? ""} ${d.donor?.last_name ?? ""}`.trim(),
        donor_email: d.donor?.email ?? "",
        donor_phone: d.donor?.phone ?? "",
        campaign_name: d.campaign?.name ?? null,
        organization_name: d.organization?.name ?? null,
      }));
    },
  });
}

/* -------------------------------------------------------
   FETCH DONATION FOR A SPECIFIC YAHRZEIT
------------------------------------------------------- */
export function useDonationForYahrzeit(yahrzeitId?: string | null) {
  return useQuery({
    queryKey: ["donation-for-yahrzeit", yahrzeitId],
    enabled: !!yahrzeitId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("yahrzeit_id", yahrzeitId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });
}

/* -------------------------------------------------------
   FETCH DONATIONS FOR A SPECIFIC DONOR
------------------------------------------------------- */
export function useDonorDonations(donorId?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["donor-donations", donorId, organizationId],
    enabled: !!donorId && !!organizationId,

    queryFn: async (): Promise<Donation[]> => {
      let query = supabase
        .from("donations")
        .select(DONATION_SELECT)
        .eq("donor_id", donorId)
        .order("date", { ascending: false });

      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      } else {
        if (organizationId !== "all")
          query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        donor_name:
          d.donor?.display_name ||
          `${d.donor?.first_name ?? ""} ${d.donor?.last_name ?? ""}`.trim(),
        donor_email: d.donor?.email ?? "",
        donor_phone: d.donor?.phone ?? "",
        campaign_name: d.campaign?.name ?? null,
        organization_name: d.organization?.name ?? null,
      }));
    },
  });
}

/* -------------------------------------------------------
   CREATE DONATION
------------------------------------------------------- */
export async function createDonation(input: any) {
  const { data, error } = await supabase
    .from("donations")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDonation,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["donations"] });

      if (vars.donor_id) {
        qc.invalidateQueries({
          queryKey: ["donor-donations", vars.donor_id],
        });
      }
      if (vars.yahrzeit_id) {
        qc.invalidateQueries({
          queryKey: ["donation-for-yahrzeit", vars.yahrzeit_id],
        });
      }
    },
  });
}

/* -------------------------------------------------------
   UPDATE DONATION
------------------------------------------------------- */
export async function updateDonation(input: any) {
  const { id, ...rest } = input;

  const { data, error } = await supabase
    .from("donations")
    .update(rest)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export function useUpdateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDonation,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["donations"] });

      if (vars.donor_id) {
        qc.invalidateQueries({
          queryKey: ["donor-donations", vars.donor_id],
        });
      }
      if (vars.yahrzeit_id) {
        qc.invalidateQueries({
          queryKey: ["donation-for-yahrzeit", vars.yahrzeit_id],
        });
      }
    },
  });
}

/* -------------------------------------------------------
   DELETE DONATION
------------------------------------------------------- */
export async function deleteDonation(id: string) {
  const { error } = await supabase.from("donations").delete().eq("id", id);
  if (error) throw error;
}

export function useDeleteDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDonation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations"] });
    },
  });
}

/* -------------------------------------------------------
   UPSERT YAHRZEIT DONATION (INSERT/UPDATE)
------------------------------------------------------- */
export function useUpsertYahrzeitDonation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      yahrzeitId: string;
      donorId: string;
      organizationId: string;
      amount: number;
      currency: string;
    }) => {
      const { id, yahrzeitId, donorId, organizationId, amount, currency } =
        payload;

      let query;

      if (id) {
        query = supabase
          .from("donations")
          .update({
            donor_id: donorId,
            organization_id: organizationId,
            yahrzeit_id: yahrzeitId,
            amount,
            currency,
            category: "yahrzeit",
          })
          .eq("id", id)
          .select("*")
          .single();
      } else {
        query = supabase
          .from("donations")
          .insert({
            donor_id: donorId,
            organization_id: organizationId,
            yahrzeit_id: yahrzeitId,
            amount,
            currency,
            category: "yahrzeit",
          })
          .select("*")
          .single();
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["donation-for-yahrzeit", vars.yahrzeitId],
      });
      qc.invalidateQueries({
        queryKey: ["donor-donations", vars.donorId],
      });
      qc.invalidateQueries({
        queryKey: ["donations"],
      });
    },
  });
}
