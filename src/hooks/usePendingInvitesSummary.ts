import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PendingInvitesSummary = Record<string, number>;

export function usePendingInvitesSummary(organizationId: string | null) {
  return useQuery<PendingInvitesSummary>({
    queryKey: ["pending-invites-summary", organizationId ?? "all"],
    enabled: organizationId !== null,

    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "list-invites",
        {
          body: {
            organization_id: organizationId ?? "all",
            summary: true,
          },
        }
      );

      if (error) {
        throw error;
      }

      // ✅ תמיד מחזירים ערך
      return data?.summary ?? {};
    },
  });
}
