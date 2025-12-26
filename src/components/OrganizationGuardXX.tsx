// src/components/OrganizationGuard.tsx
import { ReactNode, useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { AlertTriangle, ShieldOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

export default function OrganizationGuard({ children }: Props) {
  const {
    user,
    userLoading,
    isGlobalSuperAdmin,
    organizationId,
    roles,
  } = useUser();

  const { organizations = [], isLoading: orgsLoading } = useOrganizations();

  const state = useMemo(() => {
    if (userLoading || orgsLoading) return { status: "loading" as const };
    if (!user) return { status: "no-user" as const };

    if (isGlobalSuperAdmin) {
      return { status: "ok" as const };
    }

    if (!organizationId) {
      return { status: "no-org" as const };
    }

    const org = organizations.find((o) => o.id === organizationId);
    if (!org) {
      return { status: "org-not-found" as const };
    }

    if (org.subscription_status !== "active") {
      return {
        status: "org-inactive" as const,
        orgName: org.name,
      };
    }

    const role = roles.find((r) => r.organization_id === organizationId);
    if (!role) {
      return {
        status: "no-role" as const,
        orgName: org.name,
      };
    }

    if (role.suspended) {
      return {
        status: "role-suspended" as const,
        role: role.role,
        orgName: org.name,
      };
    }

    return { status: "ok" as const };
  }, [
    user,
    userLoading,
    isGlobalSuperAdmin,
    organizationId,
    roles,
    organizations,
    orgsLoading,
  ]);

  /* ---------------- LOADING ---------------- */
  if (state.status === "loading") {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  /* ---------------- BLOCKED ---------------- */
  if (state.status !== "ok") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-slate-50">
        <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6 text-center space-y-4">

          <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />

          {/* ORGANIZATION INACTIVE */}
          {state.status === "org-inactive" && (
            <>
              <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization inactive
              </h2>
              <p className="text-sm text-muted-foreground">
                The organization <b>{state.orgName}</b> is currently not active.
                <br />
                Access is temporarily disabled for all users.
              </p>
              <p className="text-xs text-muted-foreground">
                Please contact a system administrator to activate the organization.
              </p>
            </>
          )}

          {/* ROLE SUSPENDED */}
          {state.status === "role-suspended" && (
            <>
              <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
                <ShieldOff className="w-5 h-5" />
                Access suspended
              </h2>
              <p className="text-sm text-muted-foreground">
                Your role <b>{state.role}</b> in organization{" "}
                <b>{state.orgName}</b> is currently suspended.
              </p>
              <p className="text-xs text-muted-foreground">
                You will regain access once your role is reactivated by an administrator.
              </p>
            </>
          )}

          {/* NO ROLE */}
          {state.status === "no-role" && (
            <>
              <h2 className="text-lg font-semibold">No access to organization</h2>
              <p className="text-sm text-muted-foreground">
                You do not have an active role in this organization.
              </p>
              <p className="text-xs text-muted-foreground">
                If you believe this is a mistake, please contact your organization administrator.
              </p>
            </>
          )}

          {/* NO ORG */}
          {state.status === "no-org" && (
            <>
              <h2 className="text-lg font-semibold">No organization selected</h2>
              <p className="text-sm text-muted-foreground">
                Please select an active organization to continue.
              </p>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/auth";
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- OK ---------------- */
  return <>{children}</>;
}
