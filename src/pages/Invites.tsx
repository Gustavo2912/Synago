import { useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { usePendingInvites } from "@/hooks/usePendingInvites";

export default function Invites() {
  const queryClient = useQueryClient();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  // כרגע ניהול לפי הארגון הנבחר (organizationId)
  const orgId = organizationId;

  const { data: invites, isLoading, error } = usePendingInvites(orgId);

  const resendMutation = useMutation({
    mutationFn: async (invite_id: string) => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("resend-invite", {
        body: { invite_id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation resent");
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to resend"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (invite_id: string) => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("cancel-invite", {
        body: { invite_id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel"),
  });

  const rows = useMemo(() => invites ?? [], [invites]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pending Invites</h2>
        <div className="text-sm text-muted-foreground">
          {orgId ? `Organization: ${orgId}` : "No organization selected"}
        </div>
      </div>

      {isLoading && <div>Loading invites…</div>}

      {error && (
        <div className="text-sm text-red-600">
          {(error as any)?.message || "Failed to load invites"}
        </div>
      )}

      {!isLoading && !rows.length && (
        <div className="text-sm text-muted-foreground">
          No pending invites
        </div>
      )}

      {!!rows.length && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Role</th>
                <th className="p-3">Expires</th>
                <th className="p-3" />
              </tr>
            </thead>

            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{i.email}</td>
                  <td className="p-3">{i.organization_name ?? i.organization_id}</td>
                  <td className="p-3">{i.role}</td>
                  <td className="p-3">
                    {new Date(i.expires_at).toLocaleString()}
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendMutation.mutate(i.id)}
                      disabled={resendMutation.isPending || cancelMutation.isPending}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelMutation.mutate(i.id)}
                      disabled={resendMutation.isPending || cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
