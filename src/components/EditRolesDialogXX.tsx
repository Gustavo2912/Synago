// src/components/EditRolesDialog.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Building2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import type { UserWithRoles, UserRoleEntry } from "@/hooks/useTeamUsers";

type OrgLite = { id: string; name: string | null };

type EditRolesDialogProps = {
  open: boolean;
  onClose: () => void;
  user: UserWithRoles | null;
  organizations: OrgLite[];
  canEdit: boolean;
};

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "synagogue_admin", label: "Synagogue Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "donor", label: "Donor" },
  { value: "member", label: "Member" },
];

export const EditRolesDialog = ({
  open,
  onClose,
  user,
  organizations,
  canEdit,
}: EditRolesDialogProps) => {
  const queryClient = useQueryClient();

  const [newRoleOrgId, setNewRoleOrgId] = useState<string>("none"); // לא ריק
  const [newRoleName, setNewRoleName] = useState<string>("member");

  const updateRoleSuspended = useMutation({
    mutationFn: async ({
      roleId,
      suspended,
    }: {
      roleId: string;
      suspended: boolean;
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ suspended })
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role");
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role removed");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove role");
    },
  });

  const addRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      organization_id,
    }: {
      userId: string;
      role: string;
      organization_id: string | null;
    }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role,
        organization_id,
        suspended: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role added");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add role");
    },
  });

  if (!open || !user) return null;

  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.email ||
    user.user_id;

  const handleToggleSuspend = (role: UserRoleEntry) => {
    if (!canEdit) return;
    updateRoleSuspended.mutate({
      roleId: role.id,
      suspended: !role.suspended,
    });
  };

  const handleDeleteRole = (role: UserRoleEntry) => {
    if (!canEdit) return;
    if (!window.confirm("Remove this role from user?")) return;
    deleteRole.mutate(role.id);
  };

  const handleAddRole = () => {
    if (!canEdit || !user) return;
    if (!newRoleName) return;

    const orgId = newRoleOrgId === "none" ? null : newRoleOrgId;

    addRole.mutate({
      userId: user.user_id,
      role: newRoleName,
      organization_id: orgId,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // reset מצב כשסוגרים
          setNewRoleOrgId("none");
          setNewRoleName("member");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Manage Roles – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Existing roles */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Existing roles</h3>
            {user.roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No roles yet. Add one below.
              </p>
            ) : (
              <div className="space-y-2">
                {user.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.role}</Badge>
                        {role.organization_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {role.organization_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Created at:{" "}
                        {new Date(role.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant={role.suspended ? "outline" : "secondary"}
                        disabled={updateRoleSuspended.isPending || !canEdit}
                        onClick={() => handleToggleSuspend(role)}
                      >
                        {updateRoleSuspended.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : role.suspended ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteRole.isPending || !canEdit}
                        onClick={() => handleDeleteRole(role)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new role */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add role
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              {/* Organization select */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Organization (optional)
                </span>
                <Select
                  value={newRoleOrgId}
                  onValueChange={(v) => setNewRoleOrgId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose organization (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">– None –</SelectItem>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name || o.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role select */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Role</span>
                <Select
                  value={newRoleName}
                  onValueChange={(v) => setNewRoleName(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={addRole.isPending || !canEdit}
                onClick={handleAddRole}
              >
                {addRole.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add role
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
