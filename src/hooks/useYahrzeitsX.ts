// src/hooks/useYahrzeits.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function useYahrzeits() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["yahrzeits", organizationId],
    queryFn: async () => {
      const query = supabase
        .from("yahrzeits")
        .select(
          `
          *,
          donors:donor_id (
            id,
            first_name,
            last_name,
            display_name,
            email,
            phone
          ),
          organizations:organization_id (
            id,
            name
          )
        `
        )
        .order("secular_date", { ascending: true });

      if (!isGlobalSuperAdmin && organizationId && organizationId !== "all") {
        query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (
        data?.map((y: any) => ({
          ...y,
          donor_name:
            y.donors?.display_name ||
            `${y.donors?.first_name ?? ""} ${y.donors?.last_name ?? ""}`.trim(),
          donor_email: y.donors?.email || "",
          donor_phone: y.donors?.phone || "",
          organization_name: y.organizations?.name || "",
        })) ?? []
      );
    },
  });
}

export function useYahrzeitDonations() {
  return useQuery({
    queryKey: ["yahrzeit-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("category", "yahrzeit")
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateYahrzeit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("yahrzeits")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}

export function useUpdateYahrzeit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from("yahrzeits")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}

export function useDeleteYahrzeit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("yahrzeits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}
