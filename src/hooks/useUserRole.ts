import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const { data: userRole, isLoading } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // נשלוף role + organization_id
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return data || null;
    },
    staleTime: 5 * 1000,
  });

  return {
    userRole,
    role: userRole?.role || null,
    organizationId: userRole?.organization_id || null,
    isLoading,
  };
};
