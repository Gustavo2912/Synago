import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  organization_id: string;
  organization_name: string | null;
};

export function usePendingInvites(organizationId: string | null) {
  return useQuery({
    queryKey: ["pending-invites", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("list-invites", {
        body: { organization_id: organizationId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      return (data?.invites ?? []) as PendingInvite[];
    },
  });
}
