import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Plus,
  Building2,
  X,
} from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import type { UserWithRoles, UserRoleEntry } from "@/hooks/useTeamUsers";

export type OrgLite = { id: string; name: string | null };

type EditUserDialogProps = {
  open: boolean;
  onClose: () => void;
  user: UserWithRoles | null;
  organizations: OrgLite[];
};

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "synagogue_admin", label: "Synagogue Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "donor", label: "Donor" },
  { value: "member", label: "Member" },
];

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onClose,
  user,
  organizations,
}) => {
  const queryClient = useQueryClient();
  const { isGlobalSuperAdmin, organizationId, permissions } = useUser();

  const canEditRoles = isGlobalSuperAdmin || permissions.manage_users;

  /* ---------------- PROFILE FORM ---------------- */
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    position: "",
  });

  /* ---------------- ADD ROLE STATE ---------------- */
  const [newRoleOrgId, setNewRoleOrgId] = useState("");
  const [newRoleName, setNewRoleName] = useState("member");

  useEffect(() => {
    if (!user) return;

    setForm({
      email: user.email ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      zip: user.zip ?? "",
      country: user.country ?? "",
      position: user.position ?? "",
    });

    if (!isGlobalSuperAdmin && organizationId) {
      setNewRoleOrgId(organizationId);
    } else {
      setNewRoleOrgId("");
    }

    setNewRoleName("member");
  }, [user, isGlobalSuperAdmin, organizationId]);

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "";

  /* ---------------- VISIBLE ROLES ---------------- */
  const visibleRoles: UserRoleEntry[] = useMemo(() => {
    if (!user) return [];
    if (isGlobalSuperAdmin) return user.roles;
    if (!organizationId) return [];
    return user.roles.filter((r) => r.organization_id === organizationId);
  }, [user, isGlobalSuperAdmin, organizationId]);

  /* ---------------- MUTATIONS ---------------- */

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("users_profiles")
        .upsert(
          {
            user_id: user.user_id,
            email: form.email || null,
            first_name: form.first_name || null,
            last_name: form.last_name || null,
            phone: form.phone || null,
            address: form.address || null,
            city: form.city || null,
            state: form.state || null,
            zip: form.zip || null,
            country: form.country || null,
            position: form.position || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Profile saved");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to save profile"),
  });

  const toggleRoleSuspended = useMutation({
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
      toast.success("Role status updated");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to update role"),
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
    onError: (err: any) =>
      toast.error(err.message || "Failed to remove role"),
  });

  const addRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      organization_id,
    }: {
      userId: string;
      role: string;
      organization_id: string;
    }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role,
        organization_id,
        suspended: true, // 🔒 NEW ROLE STARTS SUSPENDED
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role added (inactive)");
      setNewRoleName("member");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to add role"),
  });

  if (!open || !user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User – {fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ---------------- PROFILE ---------------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Profile</h3>

            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled className="bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
              >
                {saveProfile.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save profile
              </Button>
            </div>
          </section>

          {/* ---------------- ROLES ---------------- */}
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles & Organizations
            </h3>

            {visibleRoles.map((role) => (
              <div
                key={role.id}
                className="flex justify-between items-center border rounded-md px-3 py-2"
              >
                <div className="flex flex-col gap-1">
                  <Badge
                    variant={role.suspended ? "outline" : "secondary"}
                  >
                    {role.role}
                  </Badge>
                  {role.organization_name && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {role.organization_name}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant={role.suspended ? "outline" : "secondary"}
                    disabled={!canEditRoles}
                    onClick={() =>
                      toggleRoleSuspended.mutate({
                        roleId: role.id,
                        suspended: !role.suspended,
                      })
                    }
                  >
                    {role.suspended ? (
                      <ShieldOff className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={!canEditRoles}
                    onClick={() => deleteRole.mutate(role.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* ADD ROLE */}
            {canEditRoles && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-semibold flex gap-2 items-center">
                  <Plus className="w-3 h-3" />
                  Add role
                </h4>

                {isGlobalSuperAdmin && (
                  <Select
                    value={newRoleOrgId}
                    onValueChange={setNewRoleOrgId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={newRoleName}
                  onValueChange={setNewRoleName}
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

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() =>
                      user &&
                      newRoleOrgId &&
                      addRole.mutate({
                        userId: user.user_id,
                        role: newRoleName,
                        organization_id: newRoleOrgId,
                      })
                    }
                  >
                    Add role (inactive)
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
