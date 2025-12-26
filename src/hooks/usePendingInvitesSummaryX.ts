import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PendingInvitesSummary = {
  total: number;
  byOrganization: {
    organization_id: string;
    organization_name: string | null;
    count: number;
  }[];
};

export function usePendingInvitesSummary(
  organizationId: string | null,
  enabled: boolean
) {
  return useQuery<PendingInvitesSummary>({
    queryKey: ["pending-invites-summary", organizationId],
    enabled,
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke(
        "list-invites",
        {
          body: { organization_id: organizationId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;

      const invites = data?.invites ?? [];

      const map = new Map<
        string,
        { organization_id: string; organization_name: string | null; count: number }
      >();

      invites.forEach((i: any) => {
        if (!map.has(i.organization_id)) {
          map.set(i.organization_id, {
            organization_id: i.organization_id,
            organization_name: i.organization_name,
            count: 0,
          });
        }
        map.get(i.organization_id)!.count += 1;
      });

      return {
        total: invites.length,
        byOrganization: Array.from(map.values()),
      };
    },
  });
}
