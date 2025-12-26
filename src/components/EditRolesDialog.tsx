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

export type OrgLite = { id: string; name: string | null };

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

  // ALWAYS NON-EMPTY VALUES
  const [newRoleOrgId, setNewRoleOrgId] = useState<string>("none");
  const [newRoleName, setNewRoleName] = useState<string>("member");

  const updateRoleSuspended = useMutation({
    mutationFn: async ({ roleId, suspended }: { roleId: string; suspended: boolean }) => {
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
    onError: (err: any) => toast.error(err.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role removed");
    },
    onError: (err: any) => toast.error(err.message),
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
    onError: (err: any) => toast.error(err.message),
  });

  if (!open || !user) return null;

  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.email ||
    user.user_id;

  const handleToggleSuspend = (role: UserRoleEntry) => {
    if (!canEdit) return;
    updateRoleSuspended.mutate({ roleId: role.id, suspended: !role.suspended });
  };

  const handleDeleteRole = (role: UserRoleEntry) => {
    if (!canEdit) return;
    if (!window.confirm("Remove this role?")) return;
    deleteRole.mutate(role.id);
  };

  const handleAddRole = () => {
    if (!canEdit || !user) return;

    const orgId = newRoleOrgId === "none" ? null : newRoleOrgId;

    addRole.mutate({
      userId: user.user_id,
      role: newRoleName,
      organization_id: orgId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setNewRoleOrgId("none");
        setNewRoleName("member");
        onClose();
      }
    }}>
      <DialogContent aria-describedby="" className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Manage Roles — {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* existing roles */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Existing roles</h3>

            {user.roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No roles yet.</p>
            ) : (
              <div className="space-y-2">
                {user.roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.role}</Badge>
                        {role.organization_name && (
                          <span className="text-xs inline-flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {role.organization_name}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground">
                        Created at: {new Date(role.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* suspend toggle */}
                      <Button
                        size="icon"
                        variant={role.suspended ? "outline" : "secondary"}
                        disabled={updateRoleSuspended.isPending}
                        onClick={() => handleToggleSuspend(role)}
                      >
                        {role.suspended ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </Button>

                      {/* delete */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteRole.isPending}
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

          {/* add new role */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Role
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* org */}
              <div>
                <label className="text-xs text-muted-foreground">Organization</label>
                <Select
                  value={newRoleOrgId}
                  onValueChange={(v) => setNewRoleOrgId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose organization" />
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

              {/* role */}
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <Select
                  value={newRoleName}
                  onValueChange={(v) => setNewRoleName(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role" />
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
              <Button onClick={handleAddRole} disabled={addRole.isPending}>
                {addRole.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Role
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
