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

  const resend = async (id: string) => {
    const { error } = await supabase.functions.invoke(
      "resend-invite",
      { body: { invite_id: id } }
    );

    if (error) toast.error("Failed to resend invite");
    else toast.success("Invite resent");
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.functions.invoke(
      "cancel-invite",
      { body: { invite_id: id } }
    );

    if (error) toast.error("Failed to cancel invite");
    else {
      toast.success("Invite cancelled");
      refetch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Pending Invitations</DialogTitle>
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
            <div className="grid grid-cols-12 text-xs text-muted-foreground px-2">
              <div className="col-span-4">Email</div>
              <div className="col-span-3">Organization</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {data.map((i) => (
              <div
                key={i.id}
                className="grid grid-cols-12 items-center gap-2 border rounded p-3"
              >
                {/* Email */}
                <div className="col-span-4 break-all text-sm">
                  {i.email}
                </div>

                {/* Organization */}
                <div className="col-span-3 text-sm">
                  {i.organization_name}
                </div>

                {/* Role */}
                <div className="col-span-2">
                  <Badge variant="secondary">
                    {i.role}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex justify-end gap-2">
                  <Badge variant="outline">
                    {i.expires_at
                      ? `Expires ${new Date(
                          i.expires_at
                        ).toLocaleDateString()}`
                      : "No expiry"}
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resend(i.id)}
                  >
                    Resend
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancel(i.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
