// src/hooks/useYahrzeits.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

// =============================================================
// Load Yahrzeits
// =============================================================
export function useYahrzeits() {
  const { organizationId, isGlobalSuperAdmin } = useUser();

  return useQuery({
    queryKey: ["yahrzeits", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const query = supabase
        .from("yahrzeits")
        .select(
          `
          *,
          donors (
            id,
            name,
            email,
            phone
          ),
          organizations ( name )
        `
        );

      if (!isGlobalSuperAdmin || organizationId !== "all") {
        query.eq("organization_id", organizationId);
      }

      const { data, error } = await query.order("secular_date", { ascending: true });
      if (error) throw error;

      // Normalize
      return data.map((y: any) => ({
        ...y,
        donor_name: y.donors?.name || "",
        donor_email: y.donors?.email || "",
        donor_phone: y.donors?.phone || "",
        organization_name: y.organizations?.name || "",
      }));
    },
  });
}

// =============================================================
// Load Donations For Yahrzeits
// =============================================================
export function useYahrzeitDonations() {
  return useQuery({
    queryKey: ["yahrzeit-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yahrzeit_donations")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// =============================================================
// Create Yahrzeit
// =============================================================
export function useCreateYahrzeit() {
  const queryClient = useQueryClient();
  const { organizationId } = useUser();

  return useMutation({
    mutationFn: async (payload: any) => {
      const finalPayload = {
        ...payload,
        organization_id: organizationId,
      };

      const { data, error } = await supabase
        .from("yahrzeits")
        .insert(finalPayload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}

// =============================================================
// Update Yahrzeit
// =============================================================
export function useUpdateYahrzeit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      if (!payload.id) throw new Error("Missing Yahrzeit ID");

      const updatePayload = { ...payload };

      // donor_id חובה
      if (!updatePayload.donor_id) {
        console.warn("Missing donor_id in update, aborting:", updatePayload);
        throw new Error("donor_id is required");
      }

      const { data, error } = await supabase
        .from("yahrzeits")
        .update(updatePayload)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}

// =============================================================
// Delete
// =============================================================
export function useDeleteYahrzeit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("yahrzeits").delete().eq("id", id);
      if (error) throw error;
      return true;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yahrzeits"] });
    },
  });
}
