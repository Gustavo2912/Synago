import { ReactNode, useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  children: ReactNode;
};

export default function OrganizationGuard({ children }: Props) {
  const {
    user,
    userLoading,
    roles,
    organizationId,
    setOrganizationId,
    isGlobalSuperAdmin,
  } = useUser();

  const { organizations = [], isLoading: orgsLoading } = useOrganizations();

  /* -------------------------------------------------------
     BUILD ACCESSIBLE ORGANIZATIONS (ALWAYS RUN)
  ------------------------------------------------------- */
  const accessibleOrgs = useMemo(() => {
    if (!roles.length || !organizations.length) return [];

    return roles
      .filter((r) => !r.suspended && r.organization_id)
      .map((r) => {
        const org = organizations.find((o) => o.id === r.organization_id);
        if (!org) return null;
        if (org.subscription_status !== "active") return null;
        return { role: r, organization: org };
      })
      .filter(Boolean) as {
      role: any;
      organization: any;
    }[];
  }, [roles, organizations]);

  /* -------------------------------------------------------
     AUTO SWITCH ORG IF CURRENT IS INVALID
  ------------------------------------------------------- */
  const currentAccess = useMemo(() => {
    return accessibleOrgs.find(
      (a) => a.organization.id === organizationId
    );
  }, [accessibleOrgs, organizationId]);

  useEffect(() => {
    if (
      !userLoading &&
      !orgsLoading &&
      !isGlobalSuperAdmin &&
      accessibleOrgs.length > 0 &&
      !currentAccess
    ) {
      setOrganizationId(accessibleOrgs[0].organization.id);
    }
  }, [
    userLoading,
    orgsLoading,
    isGlobalSuperAdmin,
    accessibleOrgs,
    currentAccess,
    setOrganizationId,
  ]);

  /* -------------------------------------------------------
     RENDER LOGIC
  ------------------------------------------------------- */
  if (userLoading || orgsLoading) {
    return <CenteredText>Loading…</CenteredText>;
  }

  if (!user) return null;

  // SUPER ADMIN – never blocked
  if (isGlobalSuperAdmin) {
    return <>{children}</>;
  }

  // No accessible orgs at all
  if (accessibleOrgs.length === 0) {
    return (
      <BlockedCard
        title="No active organization access"
        description="You do not have access to any active organization."
        hint="Your roles may be suspended or the organizations are inactive."
      />
    );
  }

  // Waiting for auto-switch
  if (!currentAccess) {
    return <CenteredText>Switching to available organization…</CenteredText>;
  }

  // ✅ Access granted
  return <>{children}</>;
}

/* -------------------------------------------------------
   UI HELPERS
------------------------------------------------------- */

function CenteredText({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      {children}
    </div>
  );
}

function BlockedCard({
  title,
  description,
  hint,
}: {
  title: string;
  description: string;
  hint?: string;
}) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activeOrganizationId");
    window.location.href = "/auth";
  };

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full border rounded-xl bg-white shadow-sm p-6 text-center space-y-4">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />

        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-sm text-muted-foreground">{description}</p>

        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}

        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
