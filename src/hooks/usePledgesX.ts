// src/hooks/usePledges.ts

import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

export type Pledge = {
  id: string;
  donor_id: string;
  organization_id: string | null;
  campaign_id: string | null;

  total_amount: number;
  amount_paid: number | null;
  balance_owed: number | null;

  frequency: string | null;
  status: string | null;

  reminder_enabled: boolean | null;
  last_reminder_sent: string | null;

  created_at: string | null;
  due_date: string | null;
  notes: string | null;
  currency: string | null;

  donor?: any;
  campaign?: any;
  organization?: any;

  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  campaign_name?: string | null;
  organization_name?: string | null;
};

/* ============================================================
   FETCH ALL PLEDGES
============================================================ */
export function usePledges(organizationOverride?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const org = organizationOverride ?? organizationId;

  return useQuery({
    queryKey: ["pledges", org],
    enabled: !!org, // גם "all" נחשב תקין להצגת כל הארגונים

    queryFn: async () => {
      let query = supabase
        .from("pledges")
        .select(
          `
          *,
          donor:donors!pledges_donor_id_fkey (
            id, first_name, last_name, display_name, email, phone
          ),
          campaign:campaigns!pledges_campaign_id_fkey (
            id, name
          ),
          organization:organizations!pledges_organization_id_fkey (
            id, name
          )
        `
        )
        .order("created_at", { ascending: false });

      // ORG FILTER — no filter for super_admin + "all"
      if (!isGlobalSuperAdmin) {
        // normal users always filtered
        query = query.eq("organization_id", org);
      } else {
        // super_admin:
        if (org !== "all") {
          query = query.eq("organization_id", org);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        donor_name:
          p.donor?.display_name ||
          `${p.donor?.first_name ?? ""} ${p.donor?.last_name ?? ""}`.trim(),

        donor_email: p.donor?.email ?? "",
        donor_phone: p.donor?.phone ?? "",

        campaign_name: p.campaign?.name ?? null,
        organization_name: p.organization?.name ?? null,
      }));
    },
  });
}

/* ============================================================
   FETCH PLEDGES FOR SPECIFIC DONOR
============================================================ */
export function usePledgesByDonor(donorId?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["pledges-by-donor", donorId, organizationId],
    enabled: !!donorId,

    queryFn: async () => {
      let query = supabase
        .from("pledges")
        .select(
          `
          *,
          donor:donors!pledges_donor_id_fkey (
            id, first_name, last_name, display_name, email, phone
          ),
          campaign:campaigns!pledges_campaign_id_fkey (
            id, name
          ),
          organization:organizations!pledges_organization_id_fkey (
            id, name
          )
        `
        )
        .eq("donor_id", donorId)
        .order("due_date", { ascending: true });

      // ORG FILTER
      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      } else {
        if (organizationId !== "all") {
          query = query.eq("organization_id", organizationId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        donor_name:
          p.donor?.display_name ||
          `${p.donor?.first_name ?? ""} ${p.donor?.last_name ?? ""}`.trim(),
        donor_email: p.donor?.email ?? "",
        donor_phone: p.donor?.phone ?? "",
        campaign_name: p.campaign?.name ?? null,
        organization_name: p.organization?.name ?? null,
      }));
    },
  });
}

/* ============================================================
   CREATE
============================================================ */
export function useCreatePledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("pledges")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pledges"] });
      qc.invalidateQueries({ queryKey: ["pledges-by-donor", vars.donor_id] });
    },
  });
}

/* ============================================================
   UPDATE
============================================================ */
export function useUpdatePledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { id, ...rest } = input;

      const { data, error } = await supabase
        .from("pledges")
        .update(rest)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pledges"] });
      qc.invalidateQueries({ queryKey: ["pledges-by-donor", vars.donor_id] });
    },
  });
}

/* ============================================================
   DELETE
============================================================ */
export function useDeletePledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pledges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pledges"] });
    },
  });
}
