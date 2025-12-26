import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Loader2, UserPlus } from "lucide-react";

type OrgLite = {
  id: string;
  name: string | null;
};

type Props = {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  organizations: OrgLite[];
  roles: string[];
  isSuperAdmin: boolean;
  currentOrganizationId: string | null;
};

export default function AddUserDialog({
  open,
  onClose,
  organizations,
  roles,
  isSuperAdmin,
  currentOrganizationId,
}: Props) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"invite" | "create">("invite");
  const [form, setForm] = useState({
    email: "",
    organization_id: currentOrganizationId ?? "",
    role: "member",
  });

  const reset = () => {
    setForm({
      email: "",
      organization_id: currentOrganizationId ?? "",
      role: "member",
    });
    setMode("invite");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.email || !form.role) {
        throw new Error("Email and role are required");
      }

      const organization_id = isSuperAdmin
        ? form.organization_id
        : currentOrganizationId;

      if (!organization_id) {
        throw new Error("Organization is required");
      }

      const { data, error } = await supabase.functions.invoke(
        "invite-user",
        {
          body: {
            email: form.email,
            role: form.role,
            organization_id,
          },
        }
      );

      if (error) {
        if (error.context?.status === 409) {
          throw new Error(
            data?.message ??
              "An active invitation already exists"
          );
        }
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      reset();
      onClose(true);
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to send invite");
    },
  });

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Send an invitation by email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          {isSuperAdmin && (
            <div>
              <Label>Organization *</Label>
              <Select
                value={form.organization_id}
                onValueChange={(v) =>
                  setForm({ ...form, organization_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name || o.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Role *</Label>
            <Select
              value={form.role}
              onValueChange={(v) =>
                setForm({ ...form, role: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Send Invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
