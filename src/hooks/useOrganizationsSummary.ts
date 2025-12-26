import { useMemo } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { SUBSCRIPTION_TIERS } from "@/config/subscriptionTiers";
import { useUser } from "@/contexts/UserContext";
import { useTeamUsers } from "@/hooks/useTeamUsers";

export function useOrganizationsSummary() {
  const { organizations, isLoading } = useOrganizations();
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const { data: teamUsers = [] } = useTeamUsers();

  /* --------------------------------------
     FILTER ORGANIZATIONS BY CONTEXT
  -------------------------------------- */
  const visibleOrganizations = useMemo(() => {
    if (isGlobalSuperAdmin && organizationId === "all") {
      return organizations;
    }

    return organizations.filter((o) => o.id === organizationId);
  }, [organizations, organizationId, isGlobalSuperAdmin]);

  /* --------------------------------------
     BASIC COUNTS
  -------------------------------------- */
  const totalOrganizations = visibleOrganizations.length;

  const totalActive = visibleOrganizations.filter(
    (o) => o.subscription_status === "active"
  ).length;

  const totalInactive = visibleOrganizations.filter(
    (o) => o.subscription_status === "inactive"
  ).length;

  /* --------------------------------------
     TOTAL SUBSCRIPTION CAPACITY
     (sum of maxMembers per org tier)
  -------------------------------------- */
  const totalSubscriptionCapacity = visibleOrganizations.reduce(
    (sum, org) => {
      const tier = org.subscription_tier as keyof typeof SUBSCRIPTION_TIERS;
      return sum + (SUBSCRIPTION_TIERS[tier]?.maxMembers || 0);
    },
    0
  );

  /* --------------------------------------
     TEAM USERS FILTERED BY ORGS
  -------------------------------------- */
  const usersForVisibleOrgs = useMemo(() => {
    const orgIds = new Set(visibleOrganizations.map((o) => o.id));

    return teamUsers.filter((u) =>
      u.roles.some((r) => orgIds.has(r.organization_id))
    );
  }, [teamUsers, visibleOrganizations]);

  /* --------------------------------------
     TOTAL MEMBERS (ACTUAL)
     = count of role assignments
  -------------------------------------- */
  const totalMembersActual = usersForVisibleOrgs.reduce(
    (sum, u) => sum + u.roles.length,
    0
  );

  /* --------------------------------------
     TOTAL USERS (UNIQUE)
  -------------------------------------- */
  const totalUsersUnique = new Set(
    usersForVisibleOrgs.map((u) => u.user_id)
  ).size;

  return {
    isLoading,

    totalOrganizations,
    totalActive,
    totalInactive,

    totalSubscriptionCapacity,
    totalMembersActual,
    totalUsersUnique,
  };
}
