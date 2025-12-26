// src/components/EditUserDialog.tsx
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // -------------------- PROFILE FORM STATE --------------------
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

  // -------------------- LOCAL ROLES STATE (LIVE UI) --------------------
  const [localRoles, setLocalRoles] = useState<UserRoleEntry[]>([]);

  // -------------------- ADD ROLE STATE --------------------
  const [newRoleOrgId, setNewRoleOrgId] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState<string>("member");

  useEffect(() => {
    if (!user || !open) return;

    // Profile
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

    // Roles snapshot -> local (so we can update instantly)
    setLocalRoles(user.roles || []);

    // default add-role org
    if (!isGlobalSuperAdmin && organizationId) {
      setNewRoleOrgId(organizationId);
    } else {
      setNewRoleOrgId("");
    }
    setNewRoleName("member");
  }, [user, open, isGlobalSuperAdmin, organizationId]);

  const fullName =
    (user &&
      (`${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.email ||
        user.user_id)) ||
    "";

  // visible roles: org admin sees only active org roles; super admin sees all
  const visibleRoles: UserRoleEntry[] = useMemo(() => {
    if (!user) return [];
    if (isGlobalSuperAdmin) return localRoles;
    if (!organizationId) return [];

    return localRoles.filter((r) => r.organization_id === organizationId);
  }, [user, localRoles, isGlobalSuperAdmin, organizationId]);

  // -------------------- MUTATIONS --------------------
  // Save profile only (not roles)
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
    onError: (err: any) => {
      toast.error(err.message || "Failed to save profile");
    },
  });

  // Toggle role suspended (LIVE UPDATE)
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
    onSuccess: (_data, vars) => {
      // ✅ instant UI update
      setLocalRoles((prev) =>
        prev.map((r) =>
          r.id === vars.roleId ? { ...r, suspended: vars.suspended } : r
        )
      );

      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success(vars.suspended ? "Access blocked" : "Access activated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role");
    },
  });

  // Delete role (LIVE UPDATE)
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: (_data, roleId) => {
      setLocalRoles((prev) => prev.filter((r) => r.id !== roleId));
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role removed");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove role");
    },
  });

  // Add role (LIVE UPDATE)
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
      // NOTE: we request returning row so we can update localRoles immediately
      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role,
          organization_id,
          suspended: false,
        })
        .select("id, user_id, organization_id, role, created_at, suspended")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newRow) => {
      // enrich with org name if we have it
      const orgName =
        organizations.find((o) => o.id === newRow.organization_id)?.name ?? null;

      setLocalRoles((prev) => [
        ...prev,
        {
          ...newRow,
          organization_name: orgName,
        } as any,
      ]);

      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role added");
      setNewRoleName("member");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add role");
    },
  });

  const handleToggleSuspend = (role: UserRoleEntry) => {
    if (!canEditRoles) return;
    updateRoleSuspended.mutate({
      roleId: role.id,
      suspended: !role.suspended,
    });
  };

  const handleDeleteRole = (role: UserRoleEntry) => {
    if (!canEditRoles) return;
    if (!window.confirm("Remove this role from user?")) return;
    deleteRole.mutate(role.id);
  };

  const handleAddRole = () => {
    if (!user || !canEditRoles) return;
    if (!newRoleName) return;

    let orgId: string | null = null;

    if (isGlobalSuperAdmin) {
      if (!newRoleOrgId) {
        toast.error("Please select organization for this role");
        return;
      }
      orgId = newRoleOrgId;
    } else {
      if (!organizationId) {
        toast.error("No active organization");
        return;
      }
      orgId = organizationId;
    }

    addRole.mutate({
      userId: user.user_id,
      role: newRoleName,
      organization_id: orgId,
    });
  };

  if (!open || !user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User – {fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ---------------- PROFILE SECTION ---------------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Profile</h3>

            {/* Email (read-only) */}
            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled className="bg-muted" />
            </div>

            {/* First / Last name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

            {/* Phone */}
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* Address */}
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label>ZIP</Label>
                <Input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) =>
                  setForm({ ...form, position: e.target.value })
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

          {/* ---------------- ROLES SECTION ---------------- */}
          <section className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles & Organizations
            </h3>

            {/* Existing roles */}
            <div className="space-y-2">
              {visibleRoles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No roles in this organization yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {visibleRoles.map((role) => (
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

                          {role.suspended ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge className="bg-green-600">Active</Badge>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground">
                          {role.suspended
                            ? "Access to this organization is blocked for the user."
                            : "User can view/manage this organization according to the role."}
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                          Created at:{" "}
                          {new Date(role.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle suspend */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant={role.suspended ? "outline" : "secondary"}
                              disabled={
                                updateRoleSuspended.isPending || !canEditRoles
                              }
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
                          </TooltipTrigger>
                          <TooltipContent>
                            {role.suspended
                              ? "Activate access for this organization"
                              : "Block access to this organization"}
                          </TooltipContent>
                        </Tooltip>

                        {/* Delete role */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              disabled={deleteRole.isPending || !canEditRoles}
                              onClick={() => handleDeleteRole(role)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Remove this role from the user (cannot be undone)
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add role */}
            {canEditRoles && (
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-xs font-medium flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  Add role
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  {/* org select – only for super_admin */}
                  {isGlobalSuperAdmin ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Organization
                      </span>
                      <Select
                        value={newRoleOrgId}
                        onValueChange={(v) => setNewRoleOrgId(v)}
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
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Role will be added to your active organization
                    </div>
                  )}

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
                    disabled={addRole.isPending}
                    onClick={handleAddRole}
                  >
                    {addRole.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Add role
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
