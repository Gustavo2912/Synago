import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Plus,
  Building2,
  Users,
  Phone,
  Search,
} from "lucide-react";

import { OrganizationDialog } from "@/components/OrganizationDialog";

/* =========================================================
   MAIN PAGE
========================================================= */
export default function Organizations() {
  const { t } = useLanguage();
  const { organizations = [], isLoading, updateOrganization } =
    useOrganizations();
  const { isGlobalSuperAdmin, organizationId } = useUser();
  const { role } = useUserRole();

  /* ---------------- STATE (MUST BE FIRST) ---------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /* ---------------- CONTEXT FILTER ---------------- */
  const contextFiltered = useMemo(() => {
    return organizations.filter((org) => {
      if (isGlobalSuperAdmin && organizationId === "all") return true;
      return org.id === organizationId;
    });
  }, [organizations, isGlobalSuperAdmin, organizationId]);

  /* ---------------- UI FILTERS ---------------- */
  const filteredOrganizations = useMemo(() => {
    return contextFiltered.filter((org) => {
      const blob = `${org.name} ${org.city} ${org.state} ${org.country}`
        .toLowerCase();

      if (search && !blob.includes(search.toLowerCase())) return false;
      if (statusFilter && org.subscription_status !== statusFilter)
        return false;

      return true;
    });
  }, [contextFiltered, search, statusFilter]);

  /* ---------------- SUMMARY ---------------- */
  const totalOrganizations = contextFiltered.length;
  const totalActive = contextFiltered.filter(
    (o) => o.subscription_status === "active"
  ).length;
  const totalInactive = contextFiltered.filter(
    (o) => o.subscription_status === "inactive"
  ).length;
  const totalMembers = contextFiltered.reduce(
    (sum, o) => sum + (o.member_count || 0),
    0
  );

  /* ---------------- LOADING (AFTER ALL HOOKS!) ---------------- */
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- HELPERS ---------------- */
  const badgeVariant = (status: string) =>
    status === "inactive" ? "destructive" : "secondary";

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div className="container mx-auto p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Organizations"
          value={totalOrganizations}
        />
        <SummaryCard title="Active" value={totalActive} color="green" />
        <SummaryCard
          title="Inactive"
          value={totalInactive}
          color="red"
        />
        <SummaryCard
          title="Total Members"
          value={totalMembers}
          color="blue"
        />
      </div>

      {/* FILTER BAR */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ORGANIZATION CARDS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations.map((org) => (
          <Card
            key={org.id}
            onClick={() => {
              setSelectedOrg(org);
              setDialogOpen(true);
            }}
            className={`cursor-pointer hover:shadow-lg transition
              ${
                org.subscription_status === "inactive"
                  ? "border-red-300 bg-red-50"
                  : ""
              }`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <Building2 className="h-8 w-8 text-primary" />
                <Badge variant={badgeVariant(org.subscription_status)}>
                  {org.subscription_status}
                </Badge>
              </div>

              <CardTitle className="mt-3">{org.name}</CardTitle>

              <div className="text-sm text-muted-foreground mt-1">
                {[org.city, org.state, org.country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" /> Members
                </span>
                <span className="font-semibold">
                  {org.member_count || 0}
                </span>
              </div>

              {org.contact_name && (
                <div className="pt-4 border-t text-sm">
                  <p className="font-medium">{org.contact_name}</p>
                  {org.contact_email && <p>{org.contact_email}</p>}
                  {org.contact_phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {org.contact_phone}
                    </p>
                  )}
                </div>
              )}

              {role === "super_admin" && (
                <Button
                  variant={
                    org.subscription_status === "inactive"
                      ? "outline"
                      : "destructive"
                  }
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrganization.mutate({
                      id: org.id,
                      updates: {
                        subscription_status:
                          org.subscription_status === "inactive"
                            ? "active"
                            : "inactive",
                      },
                    });
                  }}
                >
                  {org.subscription_status === "inactive"
                    ? "Activate"
                    : "Deactivate"}
                </Button>
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

/* =========================================================
   SMALL SUMMARY CARD
========================================================= */
function SummaryCard({
  title,
  value,
  color = "gray",
}: {
  title: string;
  value: number;
  color?: "gray" | "green" | "red" | "blue";
}) {
  const colorMap: Record<string, string> = {
    gray: "text-gray-700",
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };

  return (
    <Card className="bg-white/80 backdrop-blur shadow-sm border">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colorMap[color]}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
