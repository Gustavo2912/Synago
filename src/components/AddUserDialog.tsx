import { useEffect, useState } from "react";
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
import { useUser } from "@/contexts/UserContext";

/* ---------- TYPES ---------- */

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

/* ================================================================= */

export default function AddUserDialog({
  open,
  onClose,
  organizations,
  roles,
  isSuperAdmin,
  currentOrganizationId,
}: Props) {
  const queryClient = useQueryClient();
  const { permissions } = useUser();

  const canManageUsers = !!permissions.manage_users;

  const [mode, setMode] = useState<"invite" | "create">("invite");

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    position: "",
    organization_id: currentOrganizationId ?? "",
    role: "member",
  });

  /* ---------- RESET ---------- */

  const reset = () => {
    setForm({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      position: "",
      organization_id: currentOrganizationId ?? "",
      role: "member",
    });
    setMode("invite");
  };

  // 🔑 איפוס מלא בכל פתיחת דיאלוג
  useEffect(() => {
    if (open) reset();
  }, [open]);

  // Guard ל־Create
  useEffect(() => {
    if (!canManageUsers && mode === "create") {
      setMode("invite");
    }
  }, [canManageUsers, mode]);

  /* ---------- MUTATION ---------- */

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

      /* ---------- INVITE MODE ---------- */
      if (mode === "invite") {
        const { error } = await supabase.functions.invoke(
          "invite-user",
          {
            body: {
              email: form.email,
              role: form.role,
              organization_id,
            },
          }
        );
        if (error) throw error;
        return;
      }

      /* ---------- CREATE MODE ---------- */
      if (!canManageUsers) {
        throw new Error("You do not have permission to create users");
      }

      const confirmed = window.confirm(
        "This will create a user and send them an email to set a password. Continue?"
      );
      if (!confirmed) return;

      const { error } = await supabase.functions.invoke(
        "create-user-and-send-reset",
        {
          body: {
            email: form.email,
            first_name: form.first_name || null,
            last_name: form.last_name || null,
            phone: form.phone || null,
            position: form.position || null,
            role: form.role,
            organization_id,
          },
        }
      );

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success(
        mode === "invite"
          ? "Invitation sent successfully"
          : "User created. Password setup email sent."
      );

      queryClient.invalidateQueries({
        queryKey: ["team-users"],
      });

      reset();
      onClose(true);
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to add user");
    },
  });

  /* ---------- RENDER ---------- */

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add User
          </DialogTitle>
          <DialogDescription>
            Invite a user or create one directly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* MODE */}
          <div className="space-y-2">
            <Label>User creation mode</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "invite"}
                  onChange={() => setMode("invite")}
                />
                Invite by email
              </label>

              {canManageUsers && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mode === "create"}
                    onChange={() => setMode("create")}
                  />
                  Create user now
                </label>
              )}
            </div>
          </div>

          {/* EMAIL */}
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

          {/* CREATE MODE FIELDS */}
          {mode === "create" && (
            <>
              <Input
                placeholder="First name"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />
              <Input
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
              <Input
                placeholder="Position"
                value={form.position}
                onChange={(e) =>
                  setForm({ ...form, position: e.target.value })
                }
              />
            </>
          )}

          {/* ORGANIZATION */}
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

          {/* ROLE */}
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

          {/* ACTIONS */}
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
              {mode === "invite"
                ? "Send Invite"
                : "Create User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
