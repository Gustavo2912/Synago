import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export function useUsers() {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const fetchUsers = async () => {
    if (!organizationId) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, email, role, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    usersQuery: useQuery({
      queryKey: ["users", organizationId],
      queryFn: fetchUsers,
      enabled: !!organizationId,
    }),
    updateRole: updateRoleMutation,
  };
}
