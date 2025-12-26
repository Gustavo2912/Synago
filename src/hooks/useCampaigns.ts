// src/hooks/useCampaigns.ts
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Campaign = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  goal_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  created_at: string;
};

/* ============================================================
   GET ALL CAMPAIGNS — supports super_admin + “all”
============================================================ */
export function useCampaigns() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["campaigns", organizationId, isGlobalSuperAdmin],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      /* ---------------------------------------------
         SUPER ADMIN
         --------------------------------------------- */
      if (isGlobalSuperAdmin) {
        // Case 1: Super Admin selected “all”
        if (!organizationId || organizationId === "all") {
          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        }

        // Case 2: Super Admin selected a specific org
        query = query.eq("organization_id", organizationId);
      }

      /* ---------------------------------------------
         REGULAR USER
         --------------------------------------------- */
      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

/* ============================================================
   GET SINGLE CAMPAIGN
============================================================ */
export function useCampaign(campaignId?: string | null) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    enabled: !!campaignId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data as Campaign;
    },
  });
}

/* ============================================================
   CREATE (always under current org)
============================================================ */
export function useCreateCampaign() {
  const { organizationId } = useUser();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<Campaign, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{ ...payload, organization_id: organizationId }])
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },

    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

/* ============================================================
   UPDATE
============================================================ */
export function useUpdateCampaign() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Campaign>;
    }) => {
      const { error } = await supabase
        .from("campaigns")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return true;
    },

    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["campaigns"] });
      client.invalidateQueries({ queryKey: ["campaign", id] });
    },
  });
}

/* ============================================================
   DELETE
============================================================ */
export function useDeleteCampaign() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },

    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
