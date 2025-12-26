import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string | null;
  organization_id: string;
  organization_name: string;
};

export function usePendingInvites(
  organizationId: string | "all"
) {
  return useQuery({
    queryKey: ["pending-invites", organizationId],
    queryFn: async (): Promise<PendingInvite[]> => {
      let query = supabase
        .from("invites")
        .select(`
          id,
          email,
          role,
          expires_at,
          organization_id,
          organizations (
            name
          )
        `)
        .is("accepted_at", null)
        .is("cancelled_at", null);

      // 🔴 זה החלק הקריטי
      if (organizationId !== "all") {
        query = query.eq(
          "organization_id",
          organizationId
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load invites", error);
        throw error;
      }

      return (data ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expires_at: i.expires_at,
        organization_id: i.organization_id,
        organization_name:
          i.organizations?.name ?? "—",
      }));
    },
  });
}
