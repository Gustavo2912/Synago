// src/hooks/usePendingInvites.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name: string;
  created_at: string;
  expires_at: string;
};

export function usePendingInvites(organizationId: string | "all") {
  return useQuery({
    queryKey: ["pending-invites", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "list-invites",
        {
          body: {
            organization_id: organizationId,
            summary: false,
          },
        }
      );

      if (error) throw error;
      return data.invites as PendingInvite[];
    },
  });
}
