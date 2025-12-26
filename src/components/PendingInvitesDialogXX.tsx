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
import { useState } from "react";

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

  const [workingId, setWorkingId] = useState<string | null>(null);

  const resend = async (id: string) => {
    try {
      setWorkingId(id);
      const { error } = await supabase.functions.invoke(
        "resend-invite",
        { body: { invite_id: id } }
      );
      if (error) throw error;
      toast.success("Invite resent");
    } catch {
      toast.error("Failed to resend invite");
    } finally {
      setWorkingId(null);
    }
  };

  const cancel = async (id: string) => {
    try {
      setWorkingId(id);
      const { error } = await supabase.functions.invoke(
        "cancel-invite",
        { body: { invite_id: id } }
      );
      if (error) throw error;
      toast.success("Invite cancelled");
      refetch();
    } catch {
      toast.error("Failed to cancel invite");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pending Invites</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm">Loading…</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No pending invites
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div>
                  <div className="font-medium">{i.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.organization_name} · {i.role}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Expires{" "}
                    {new Date(i.expires_at).toLocaleDateString()}
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={workingId === i.id}
                    onClick={() => resend(i.id)}
                  >
                    Resend
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={workingId === i.id}
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
