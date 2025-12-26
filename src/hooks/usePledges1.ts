// src/hooks/usePledges.ts
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

export function usePledges(organizationOverride?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const org =
    organizationOverride === "all" || organizationId === "all"
      ? null
      : organizationOverride ?? organizationId;

  return useQuery({
    queryKey: ["pledges", org, isGlobalSuperAdmin],
    enabled: true,

    queryFn: async () => {
      let query = supabase
        .from("pledges")
        .select(
          `
          *,
          donor:donor_id(id,first_name,last_name,display_name,email,phone),
          campaign:campaign_id(id,name),
          organization:organization_id(id,name)
        `
        )
        .order("created_at", { ascending: false });

      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", org);
      }

      if (isGlobalSuperAdmin && org) {
        query = query.eq("organization_id", org);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });
}

export function usePledgesByDonor(donorId?: string) {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const org = organizationId === "all" ? null : organizationId;

  return useQuery({
    queryKey: ["pledges-by-donor", donorId, org],
    enabled: !!donorId,

    queryFn: async () => {
      let query = supabase
        .from("pledges")
        .select(
          `
          *,
          donor:donor_id(*),
          campaign:campaign_id(*),
          organization:organization_id(name)
        `
        )
        .eq("donor_id", donorId)
        .order("due_date", { ascending: true });

      if (!isGlobalSuperAdmin && org) {
        query = query.eq("organization_id", org);
      }

      if (isGlobalSuperAdmin && org) {
        query = query.eq("organization_id", org);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });
}
