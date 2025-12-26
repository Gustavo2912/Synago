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
   GET ALL CAMPAIGNS FOR CURRENT ORG
============================================================ */
export function useCampaigns() {
  const { organizationId } = useUser();

  return useQuery({
    queryKey: ["campaigns", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
}

/* ============================================================
   🔥 GET SINGLE CAMPAIGN (הפונקציה שהייתה חסרה!!)
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
   CREATE CAMPAIGN
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
   UPDATE CAMPAIGN
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
   DELETE CAMPAIGN
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
