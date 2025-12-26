import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";

type Organization = Tables<"organizations">;

/* ==========================================================
   MAIN HOOK
   ✔ Global Super Admin → ALL organizations
   ✔ Regular user → only organizations he belongs to
========================================================== */
export const useOrganizations = () => {
  const queryClient = useQueryClient();
  const { isGlobalSuperAdmin, roles } = useUser();

  /* --------------------------------------
      LOAD ORGANIZATIONS
  -------------------------------------- */
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations", isGlobalSuperAdmin, roles],
    queryFn: async () => {
      // SUPER ADMIN → full list
      if (isGlobalSuperAdmin) {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // Regular user → only organizations he has roles in
      const orgIds = Array.from(
        new Set(
          roles
            .map((r) => r.organization_id)
            .filter((id): id is string => !!id)
        )
      );

      if (orgIds.length === 0) return [];

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  /* --------------------------------------
      CREATE ORGANIZATION
      (mostly unused – creation via Edge Function)
  -------------------------------------- */
  const createOrganization = useMutation({
    mutationFn: async (org: TablesInsert<"organizations">) => {
      const cleaned = cleanOrganizationData(org);

      const { data, error } = await supabase
        .from("organizations")
        .insert(cleaned)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: (err: Error) => {
      toast.error("Failed to create organization: " + err.message);
    },
  });

  /* --------------------------------------
      UPDATE ORGANIZATION  ✅ FIXED
  -------------------------------------- */
  const updateOrganization = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: TablesUpdate<"organizations">;
    }) => {
      const cleaned = cleanOrganizationData(updates);

      const { error } = await supabase
        .from("organizations")
        .update(cleaned)
        .eq("id", id);

      if (error) throw error;

      return { id, ...cleaned };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated");
    },
    onError: (err: Error) => {
      toast.error("Failed to update organization: " + err.message);
    },
  });

  return {
    organizations,
    isLoading,
    createOrganization,
    updateOrganization,
  };
};

/* ==========================================================
   CLEANER
   Removes undefined / null values
========================================================== */
function cleanOrganizationData(data: Record<string, any>) {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (key === "member_count") {
      cleaned[key] = Number(value) || 0;
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}
