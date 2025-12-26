import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUser } from "@/contexts/UserContext";
import { useTeamUsers } from "@/hooks/useTeamUsers";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Plus,
  Building2,
  Users,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";

import { OrganizationDialog } from "@/components/OrganizationDialog";
import FilterBarCompact from "@/components/FilterBarCompact";

/* ----------------------------------------------------------
   SUBSCRIPTION CAPACITY MAP
---------------------------------------------------------- */
const TIER_CAPACITY: Record<string, number> = {
  tier_1: 50,
  tier_2: 100,
  tier_3: 250,
  tier_4: 9999,
};

export default function Organizations() {
  const { t } = useLanguage();
  const { organizations = [], isLoading, updateOrganization } =
    useOrganizations();
  const { data: teamUsers = [] } = useTeamUsers();

  const { isGlobalSuperAdmin, organizationId } = useUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  /* ----------------------------------------------------------
     FILTER STATE
     (compatible with FilterBarCompact used in Users)
  ---------------------------------------------------------- */
  const [filters, setFilters] = useState({
    searchName: "",
    searchEmail: "",
    searchPhone: "",
    searchText: "",
    status: "", // "", "active", "inactive"
  });

  const resetFilters = () =>
    setFilters({
      searchName: "",
      searchEmail: "",
      searchPhone: "",
      searchText: "",
      status: "",
    });

  /* ----------------------------------------------------------
     FILTERED ORGANIZATIONS (CORE LOGIC)
  ---------------------------------------------------------- */
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Org switcher behavior
      if (isGlobalSuperAdmin) {
        if (organizationId && organizationId !== "all") {
          if (org.id !== organizationId) return false;
        }
      } else {
        if (org.id !== organizationId) return false;
      }

      // Status filter
      if (filters.status === "active" && org.subscription_status !== "active") {
        return false;
      }
      if (
        filters.status === "inactive" &&
        org.subscription_status === "active"
      ) {
        return false;
      }

      // Text filters by fields
      const orgName = (org.name || "").toLowerCase();
      const contactName = (org.contact_name || "").toLowerCase();
      const contactEmail = (org.contact_email || "").toLowerCase();
      const contactPhone = (org.contact_phone || "").toLowerCase();

      if (filters.searchName) {
        const q = filters.searchName.toLowerCase();
        // Name should match org name OR contact name
        if (!orgName.includes(q) && !contactName.includes(q)) return false;
      }

      if (filters.searchEmail) {
        const q = filters.searchEmail.toLowerCase();
        if (!contactEmail.includes(q)) return false;
      }

      if (filters.searchPhone) {
        const q = filters.searchPhone.toLowerCase();
        if (!contactPhone.includes(q)) return false;
      }

      // Free text search across all relevant fields
      if (filters.searchText) {
        const blob = `
          ${org.name}
          ${org.contact_name}
          ${org.contact_email}
          ${org.contact_phone}
          ${org.address}
          ${org.city}
          ${org.state}
          ${org.country}
          ${org.zip}
          ${org.subscription_status}
          ${org.subscription_tier}
        `.toLowerCase();

        if (!blob.includes(filters.searchText.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [organizations, filters, isGlobalSuperAdmin, organizationId]);

  /* ----------------------------------------------------------
     SUMMARY CARDS (BASED ON FILTERED ORGS)
  ---------------------------------------------------------- */
  const totalOrganizations = filteredOrganizations.length;

  const totalActive = filteredOrganizations.filter(
    (o) => o.subscription_status === "active"
  ).length;

  const totalInactive = totalOrganizations - totalActive;

  const totalSubscriptionCapacity = filteredOrganizations.reduce(
    (sum, org) => sum + (TIER_CAPACITY[org.subscription_tier] || 0),
    0
  );

  // Efficient lookup set for filtered org ids
  const filteredOrgIds = useMemo(() => {
    return new Set(filteredOrganizations.map((o) => o.id));
  }, [filteredOrganizations]);

  /**
   * Total Members (Actual) — counts memberships (role assignments) across orgs.
   * Important: user can be counted multiple times across orgs, and even multiple roles.
   */
  const totalMembersActual = useMemo(() => {
    let count = 0;
    for (const u of teamUsers) {
      if (!u?.roles?.length) continue;
      for (const r of u.roles) {
        if (r?.organization_id && filteredOrgIds.has(r.organization_id)) {
          count += 1;
        }
      }
    }
    return count;
  }, [teamUsers, filteredOrgIds]);

  /**
   * Total Users (Unique) — counts unique users having at least one membership in filtered orgs.
   */
  const totalUsersUnique = useMemo(() => {
    const set = new Set<string>();
    for (const u of teamUsers) {
      if (!u?.roles?.length) continue;
      if (u.roles.some((r) => r?.organization_id && filteredOrgIds.has(r.organization_id))) {
        set.add(u.user_id);
      }
    }
    return set.size;
  }, [teamUsers, filteredOrgIds]);

  /* ----------------------------------------------------------
     UI HELPERS
  ---------------------------------------------------------- */
  const getStatusBadge = (status: string) => {
    if (status === "active") return <Badge>Active</Badge>;
    return <Badge variant="destructive">Inactive</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("organizations.title") || "Organizations"}
        </h1>

        <Button
          onClick={() => {
            setSelectedOrg(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("organizations.add")}
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard title="Total Organizations" value={totalOrganizations} />
        <SummaryCard title="Total Active" value={totalActive} color="green" />
        <SummaryCard title="Total Inactive" value={totalInactive} color="red" />
        <SummaryCard
          title="Total Subscription Capacity"
          value={totalSubscriptionCapacity}
        />
        <SummaryCard
          title="Total Members (Actual)"
          value={totalMembersActual}
        />
        <SummaryCard title="Total Users" value={totalUsersUnique} />
      </div>

      {/* FILTERS */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow-sm">
        <FilterBarCompact
          filters={filters}
          fields={[
            {
              key: "status",
              label: "Status",
              type: "select",
              options: ["", "active", "inactive"],
            },
          ]}
          onChange={setFilters}
          onReset={resetFilters}
        />
      </div>

      {/* ORGANIZATION CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations.map((org) => (
          <Card
            key={org.id}
            className={`cursor-pointer hover:shadow-lg transition ${
              org.subscription_status !== "active"
                ? "border-red-300 bg-red-50/50"
                : ""
            }`}
            onClick={() => {
              setSelectedOrg(org);
              setDialogOpen(true);
            }}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <Building2 className="h-8 w-8 text-primary" />
                {getStatusBadge(org.subscription_status)}
              </div>

              <CardTitle className="mt-4">{org.name}</CardTitle>

              {(org.address || org.city || org.state || org.country || org.zip) && (
                <div className="mt-1 text-xs text-muted-foreground leading-snug">
                  {[
                    org.address,
                    org.city,
                    org.state,
                    org.country,
                    org.zip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Members Estimate
                </span>
                <span className="font-semibold">{org.member_count}</span>
              </div>

              {/* Contact */}
              {(org.contact_name || org.contact_email || org.contact_phone) && (
                <div className="pt-3 border-t space-y-1 text-sm">
                  {org.contact_name && (
                    <div className="font-medium">{org.contact_name}</div>
                  )}

                  {org.contact_email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {org.contact_email}
                    </div>
                  )}

                  {org.contact_phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {org.contact_phone}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DIALOG */}
      <OrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organization={selectedOrg}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color?: "green" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "red"
      ? "text-red-700"
      : "text-blue-700";

  return (
    <Card className="bg-white/80 backdrop-blur shadow-sm border">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
