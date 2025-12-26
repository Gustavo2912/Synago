// src/components/PendingInvitesDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePendingInvites } from "@/hooks/usePendingInvites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId: string | "all";
};

export default function PendingInvitesDialog({
  open,
  onClose,
  organizationId,
}: Props) {
  const { data = [], isLoading, refetch } =
    usePendingInvites(organizationId);

  const resendInvite = async (inviteId: string) => {
    const { error } = await supabase.functions.invoke(
      "resend-invite",
      {
        body: { invite_id: inviteId },
      }
    );

    if (error) {
      toast.error("Failed to resend invite");
    } else {
      toast.success("Invite resent successfully");
    }
  };

  const cancelInvite = async (inviteId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this invite?"
    );
    if (!confirmed) return;

    const { error } = await supabase.functions.invoke(
      "cancel-invite",
      {
        body: { invite_id: inviteId },
      }
    );

    if (error) {
      toast.error("Failed to cancel invite");
    } else {
      toast.success("Invite cancelled");
      refetch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pending Invitations</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Invitations that were sent but not yet accepted
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-5 gap-3 px-3 text-xs font-medium text-muted-foreground">
              <div>Email</div>
              <div>Organization</div>
              <div>Role</div>
              <div>Expires</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Data rows */}
            {data.map((invite) => {
              const expiresLabel = invite.expires_at
                ? new Date(invite.expires_at).toLocaleDateString()
                : "No expiry";

              return (
                <div
                  key={invite.id}
                  className="grid grid-cols-5 items-center gap-3 border rounded p-3"
                >
                  <div className="font-medium truncate">
                    {invite.email}
                  </div>

                  <div className="text-sm truncate">
                    {invite.organization_name}
                  </div>

                  <div className="text-sm">
                    {invite.role}
                  </div>

                  <Badge variant="outline">
                    {expiresLabel}
                  </Badge>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        resendInvite(invite.id)
                      }
                    >
                      Resend
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        cancelInvite(invite.id)
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
