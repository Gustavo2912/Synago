import { ReactNode, useMemo } from "react";
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
    isGlobalSuperAdmin,
  } = useUser();

  const { organizations = [], isLoading: orgsLoading } = useOrganizations();

  /* -------------------------------------------------------
     LOADING STATES
  ------------------------------------------------------- */
  if (userLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading…
      </div>
    );
  }

  /* -------------------------------------------------------
     NOT AUTHENTICATED (should not happen here)
  ------------------------------------------------------- */
  if (!user) {
    return null;
  }

  /* -------------------------------------------------------
     SUPER ADMIN → ALWAYS ALLOWED
  ------------------------------------------------------- */
  if (isGlobalSuperAdmin) {
    return <>{children}</>;
  }

  /* -------------------------------------------------------
     NO ACTIVE ORGANIZATION
  ------------------------------------------------------- */
  if (!organizationId || organizationId === "all") {
    return (
      <BlockedCard
        title="No active organization"
        description="You are not currently assigned to an active organization."
        hint="Please contact a system administrator."
      />
    );
  }

  /* -------------------------------------------------------
     FIND ORGANIZATION
  ------------------------------------------------------- */
  const organization = organizations.find(
    (o) => o.id === organizationId
  );

  if (!organization) {
    return (
      <BlockedCard
        title="Organization not found or User has No permission for any organization"
        description="The organization and user data could not be loaded."
        hint="Please contact a system administrator."
      />
    );
  }

  /* -------------------------------------------------------
     ORGANIZATION INACTIVE → BLOCK ALL USERS
  ------------------------------------------------------- */
  if (organization.subscription_status !== "active") {
    return (
      <BlockedCard
        title="Organization inactive"
        description={`The organization "${organization.name}" is currently not active.`}
        hint="Access is disabled for all users until the organization is activated."
      />
    );
  }

  /* -------------------------------------------------------
     FIND USER ROLE FOR THIS ORG
  ------------------------------------------------------- */
  const roleForOrg = roles.find(
    (r) => r.organization_id === organizationId
  );

  if (!roleForOrg) {
    return (
      <BlockedCard
        title="No permission for this organization"
        description={`You do not have an assigned role in "${organization.name}".`}
        hint="Please contact an administrator of this organization."
      />
    );
  }

  /* -------------------------------------------------------
     ROLE SUSPENDED
  ------------------------------------------------------- */
  if (roleForOrg.suspended) {
    return (
      <BlockedCard
        title="Access suspended"
        description={`Your role "${roleForOrg.role}" in "${organization.name}" is currently suspended.`}
        hint="Please contact an administrator to restore access."
      />
    );
  }

  /* -------------------------------------------------------
     ALL GOOD
  ------------------------------------------------------- */
  return <>{children}</>;
}

/* =======================================================
   BLOCKED UI
======================================================= */
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
    localStorage.removeItem("supabase.auth.token");
    window.location.href = "/auth";
  };

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full border rounded-xl bg-white shadow-sm p-6 text-center space-y-4">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />

        <h2 className="text-lg font-semibold">{title}</h2>

        <p className="text-sm text-muted-foreground">
          {description}
        </p>

        {hint && (
          <p className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}

        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
