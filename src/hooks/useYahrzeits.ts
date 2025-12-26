// src/hooks/useYahrzeits.ts
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";

/* -------------------------------------------------------
   COMMON SELECT (donor + org)
------------------------------------------------------- */
const YAHRZEITS_SELECT = `
  *,
  donor:donor_id (
    id, first_name, last_name, display_name, email, phone
  ),
  organization:organization_id (
    id, name
  )
`;

/* -------------------------------------------------------
   FETCH YAHRZEITS (Filtered by ORG unless super admin)
------------------------------------------------------- */
export function useYahrzeits() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["yahrzeits", organizationId],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase.from("yahrzeits").select(YAHRZEITS_SELECT);

      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      } else if (organizationId !== "all") {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query.order("secular_date");
      if (error) throw error;

      return (data || []).map((y: any) => ({
        ...y,
        donor_name:
          y.donor?.display_name ||
          `${y.donor?.first_name ?? ""} ${y.donor?.last_name ?? ""}`.trim(),
        donor_email: y.donor?.email ?? "",
        donor_phone: y.donor?.phone ?? "",
        organization_name: y.organization?.name ?? "",
      }));
    },
  });
}

/* -------------------------------------------------------
   FETCH DONATIONS FOR ALL YAHRZEITS (used in stats)
------------------------------------------------------- */
export function useYahrzeitDonations() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["yahrzeit-donations", organizationId],
    enabled: !!organizationId,

    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select(`
          *,
          donor:donor_id (
            id, first_name, last_name, display_name, email, phone
          ),
          organization:organization_id ( id, name )
        `)
        .eq("category", "yahrzeit")
        .order("date", { ascending: false });

      if (!isGlobalSuperAdmin) {
        query = query.eq("organization_id", organizationId);
      } else if (organizationId !== "all") {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });
}

/* -------------------------------------------------------
   CREATE
------------------------------------------------------- */
export function useCreateYahrzeit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("yahrzeits")
        .insert(input)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}

/* -------------------------------------------------------
   UPDATE
------------------------------------------------------- */
export function useUpdateYahrzeit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const { id, ...rest } = input;

      const { data, error } = await supabase
        .from("yahrzeits")
        .update(rest)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
      qc.invalidateQueries({ queryKey: ["yahrzeit-donations"] });
      qc.invalidateQueries({ queryKey: ["donors"] });
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

/* -------------------------------------------------------
   DELETE
------------------------------------------------------- */
export function useDeleteYahrzeit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("yahrzeits").delete().eq("id", id);
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
      qc.invalidateQueries({ queryKey: ["yahrzeit-donations"] });
    },
  });
}
