import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUser } from "@/contexts/UserContext";
import { useUserRole } from "@/hooks/useUserRole";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Plus,
  Building2,
  Users,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

import { OrganizationDialog } from "@/components/OrganizationDialog";
import FilterBarCompact from "@/components/FilterBarCompact";

type TeamUsersViewRow = {
  user_id: string;
  organization_id: string;
  role_id: string | null;
  role: string | null;
  role_suspended: boolean | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

export default function Organizations() {
  const { t } = useLanguage();
  const { role } = useUserRole();
  const { isGlobalSuperAdmin, organizationId } = useUser();

  const { organizations = [], isLoading, updateOrganization } =
    useOrganizations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  /* ---------------- FILTER STATE ----------------
     תואם לפילטרים "Search by Name / Email / Phone" כמו ב-Users
  ------------------------------------------------ */
  const [filters, setFilters] = useState({
    searchName: "",
    searchEmail: "",
    searchPhone: "",
    searchText: "",
    status: "",
    country: "",
    tier: "",
  });

  const resetFilters = () =>
    setFilters({
      searchName: "",
      searchEmail: "",
      searchPhone: "",
      searchText: "",
      status: "",
      country: "",
      tier: "",
    });

  /* ---------------- BASE ORGS BY CONTEXT ---------------- */
  const baseOrganizations = useMemo(() => {
    if (isGlobalSuperAdmin && organizationId === "all") return organizations;
    return organizations.filter((o) => o.id === organizationId);
  }, [organizations, isGlobalSuperAdmin, organizationId]);

  /* ---------------- APPLY FILTERS ---------------- */
  const filteredOrganizations = useMemo(() => {
    const qName = filters.searchName.trim().toLowerCase();
    const qEmail = filters.searchEmail.trim().toLowerCase();
    const qPhone = filters.searchPhone.trim().toLowerCase();
    const qText = filters.searchText.trim().toLowerCase();

    return baseOrganizations.filter((org: any) => {
      const orgName = (org.name || "").toLowerCase();
      const contactName = (org.contact_name || "").toLowerCase();
      const contactEmail = (org.contact_email || "").toLowerCase();
      const contactPhone = (org.contact_phone || "").toLowerCase();

      const blob = `${orgName} ${contactName} ${contactEmail} ${contactPhone} ${
        org.city || ""
      } ${org.state || ""} ${org.country || ""} ${org.zip || ""}`.toLowerCase();

      // Search by Name
      if (qName && !(orgName.includes(qName) || contactName.includes(qName)))
        return false;

      // Search by Email
      if (qEmail && !contactEmail.includes(qEmail)) return false;

      // Search by Phone
      if (qPhone && !contactPhone.includes(qPhone)) return false;

      // General search text
      if (qText && !blob.includes(qText)) return false;

      // Status
      if (filters.status && (org.subscription_status || "") !== filters.status)
        return false;

      // Country
      if (filters.country && (org.country || "") !== filters.country)
        return false;

      // Tier
      if (filters.tier && (org.subscription_tier || "") !== filters.tier)
        return false;

      return true;
    });
  }, [baseOrganizations, filters]);

  /* ---------------- ORG IDS FOR MEMBERSHIP QUERY ---------------- */
  const filteredOrgIds = useMemo(
    () => filteredOrganizations.map((o: any) => o.id),
    [filteredOrganizations]
  );

  /* ---------------- MEMBERSHIP QUERY FROM team_users_view ----------------
     Total Members (Actual) = מספר שורות (כל membership)
     Total Users = user_id ייחודיים
  ----------------------------------------------------- */
  const { data: memberships = [], isLoading: membersLoading } = useQuery<
    TeamUsersViewRow[]
  >({
    queryKey: ["org-memberships", filteredOrgIds.join(",")],
    enabled: filteredOrgIds.length > 0,
    queryFn: async () => {
      // שים לב: אם יש הרבה שורות, אפשר לעשות pagination בעתיד.
      const { data, error } = await supabase
        .from("team_users_view")
        .select("user_id, organization_id, role_id, role, role_suspended, email, first_name, last_name")
        .in("organization_id", filteredOrgIds);

      if (error) throw error;
      return (data || []) as TeamUsersViewRow[];
    },
  });

  /* ---------------- SUMMARY ---------------- */
  const totalOrganizations = filteredOrganizations.length;

  const totalActive = filteredOrganizations.filter(
    (o: any) => o.subscription_status === "active"
  ).length;

  const totalInactive = filteredOrganizations.filter(
    (o: any) => o.subscription_status === "inactive"
  ).length;

  // Total Subscription Tier Member (capacity)
  const totalTierMembers = filteredOrganizations.reduce(
    (sum: number, o: any) => sum + (Number(o.member_count) || 0),
    0
  );

  // Actual memberships = count rows in team_users_view for these orgs
  const totalMembersActual = memberships.length;

  // Unique users across those memberships
  const totalUsers = useMemo(
    () => new Set(memberships.map((m) => m.user_id)).size,
    [memberships]
  );

  /* ---------------- FILTER BAR OPTIONS ---------------- */
  const countries = useMemo(() => {
    const s = new Set<string>();
    organizations.forEach((o: any) => {
      if (o.country) s.add(o.country);
    });
    return Array.from(s);
  }, [organizations]);

  const filterFields = [
    // These are the ones you asked that currently do not work:
    { key: "searchName", label: "Search by Name", type: "text" as const },
    { key: "searchEmail", label: "Search by Email", type: "text" as const },
    { key: "searchPhone", label: "Search by Phone", type: "text" as const },
    { key: "searchText", label: "Search (Any)", type: "text" as const },

    { key: "status", label: "Status", type: "select" as const, options: ["", "active", "inactive"] },
    { key: "country", label: "Country", type: "select" as const, options: ["", ...countries] },
    { key: "tier", label: "Subscription Tier", type: "select" as const, options: ["", "tier_1", "tier_2", "tier_3", "tier_4"] },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Organizations
        </h1>

        <Button
          onClick={() => {
            setSelectedOrg(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Summary title="Total Organizations" value={totalOrganizations} />
        <Summary title="Total Active" value={totalActive} color="text-green-700" />
        <Summary title="Total Inactive" value={totalInactive} color="text-red-700" />
        <Summary title="Total Subscription Tier Members" value={totalTierMembers} />
        <Summary
          title="Total Members (Actual)"
          value={membersLoading ? 0 : totalMembersActual}
          sub={membersLoading ? "Loading…" : undefined}
        />
        <Summary
          title="Total Users"
          value={membersLoading ? 0 : totalUsers}
          sub={membersLoading ? "Loading…" : undefined}
        />
      </div>

      {/* FILTER BAR (RESTORED + FIXED) */}
      <div className="bg-white/80 backdrop-blur border rounded-xl shadow-sm">
        <FilterBarCompact
          filters={filters}
          fields={filterFields}
          onChange={setFilters}
          onReset={resetFilters}
        />
      </div>

      {/* ORGANIZATIONS GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations.map((org: any) => (
          <Card
            key={org.id}
            className={`cursor-pointer hover:shadow-lg transition
              ${org.subscription_status === "inactive" ? "border-red-300 bg-red-50" : ""}`}
            onClick={() => {
              setSelectedOrg(org);
              setDialogOpen(true);
            }}
          >
            <CardHeader>
              <div className="flex justify-between">
                <Building2 className="h-8 w-8 text-primary" />
                <Badge
                  variant={org.subscription_status === "active" ? "default" : "destructive"}
                >
                  {org.subscription_status || "unknown"}
                </Badge>
              </div>

              <CardTitle className="mt-4">{org.name}</CardTitle>

              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 opacity-70" />
                {[org.city, org.state, org.country, org.zip].filter(Boolean).join(", ") || "-"}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* MEMBERS CAPACITY */}
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" /> Members Capacity
                </span>
                <span className="font-semibold">{org.member_count ?? "-"}</span>
              </div>

              {/* CONTACT PERSON (RESTORED) */}
              {(org.contact_name || org.contact_email || org.contact_phone) && (
                <div className="pt-4 border-t space-y-1 text-sm">
                  {org.contact_name && (
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {org.contact_name}
                    </p>
                  )}

                  {org.contact_email && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {org.contact_email}
                    </p>
                  )}

                  {org.contact_phone && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {org.contact_phone}
                    </p>
                  )}
                </div>
              )}

              {/* ACTIVATE / DEACTIVATE */}
              {role === "super_admin" && (
                <Button
                  variant={org.subscription_status === "active" ? "destructive" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrganization.mutate({
                      id: org.id,
                      updates: {
                        subscription_status:
                          org.subscription_status === "active" ? "inactive" : "active",
                      },
                    });
                  }}
                >
                  {org.subscription_status === "active" ? "Deactivate" : "Activate"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredOrganizations.length === 0 && (
          <div className="col-span-full p-10 text-center text-sm text-muted-foreground bg-white/70 border rounded-xl">
            No organizations match the current filters.
          </div>
        )}
      </div>

      <OrganizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organization={selectedOrg}
      />
    </div>
  );
}

/* ---------------- SUMMARY CARD ---------------- */

function Summary({
  title,
  value,
  color = "text-blue-700",
  sub,
}: {
  title: string;
  value: number;
  color?: string;
  sub?: string;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
