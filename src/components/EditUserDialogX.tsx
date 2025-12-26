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
  Loader2,
  ShieldCheck,
  ShieldOff,
  Plus,
  Building2,
  X,
} from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import type { UserWithRoles, UserRoleEntry } from "@/hooks/useTeamUsers";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
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

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */
export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onClose,
  user,
  organizations,
}) => {
  const queryClient = useQueryClient();
  const { isGlobalSuperAdmin, organizationId, permissions } = useUser();
  const canEditRoles = isGlobalSuperAdmin || permissions.manage_users;

  /* ---------------- PROFILE STATE ---------------- */
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
  const [newRoleOrgId, setNewRoleOrgId] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState<string>("member");

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
    user?.user_id ||
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
            ...form,
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
      toast.success("Access updated");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to update access"),
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
        suspended: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.success("Role added");
      setNewRoleName("member");
    },
  });

  if (!open || !user) return null;

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User – {fullName}</DialogTitle>
        </DialogHeader>

        {/* ---------------- PROFILE ---------------- */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Profile</h3>

          <Label>Email</Label>
          <Input value={form.email} disabled className="bg-muted" />

          <div className="grid grid-cols-2 gap-2">
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
          </div>

          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <Input
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="City"
              value={form.city}
              onChange={(e) =>
                setForm({ ...form, city: e.target.value })
              }
            />
            <Input
              placeholder="State"
              value={form.state}
              onChange={(e) =>
                setForm({ ...form, state: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="ZIP"
              value={form.zip}
              onChange={(e) =>
                setForm({ ...form, zip: e.target.value })
              }
            />
            <Input
              placeholder="Country"
              value={form.country}
              onChange={(e) =>
                setForm({ ...form, country: e.target.value })
              }
            />
          </div>

          <Input
            placeholder="Position"
            value={form.position}
            onChange={(e) =>
              setForm({ ...form, position: e.target.value })
            }
          />

          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save profile
          </Button>
        </section>

        {/* ---------------- ROLES ---------------- */}
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">
            Organization Access & Roles
          </h3>

          {visibleRoles.map((role) => {
            const blocked = role.suspended;

            return (
              <div
                key={role.id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <div>
                  <div className="flex gap-2 items-center">
                    <Badge>{role.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {role.organization_name}
                    </span>
                    {blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge className="bg-green-600">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {blocked
                      ? "User cannot access this organization"
                      : "User has active access to this organization"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant={blocked ? "outline" : "secondary"}
                    onClick={() =>
                      updateRoleSuspended.mutate({
                        roleId: role.id,
                        suspended: !blocked,
                      })
                    }
                  >
                    {blocked ? (
                      <ShieldOff className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteRole.mutate(role.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      </DialogContent>
    </Dialog>
  );
};
