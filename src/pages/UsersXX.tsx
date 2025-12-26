// src/pages/Users.tsx

import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useTeamUsers, UserWithRoles } from "@/hooks/useTeamUsers";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { EditUserDialog, OrgLite } from "@/components/EditUserDialog";
import AddUserDialog from "@/components/AddUserDialog";

import {
  UserCog as UserIcon,
  Mail,
  Phone,
  Loader2,
  Shield,
  ArrowUpDown,
  UserPlus,
} from "lucide-react";

import FilterBarCompact from "@/components/FilterBarCompact";

/* ---------------- HELPERS: HIGHLIGHT + CSV ---------------- */

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string | null | undefined, query: string) {
  if (!text) return "";
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.split(regex).map((part, i) =>
    i % 2 ? (
      <mark key={i} className="bg-yellow-200 text-black px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function exportCSV(filename: string, rows: any[]) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Position",
    "Roles",
    "Organizations",
    "Status",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.name}"`,
        `"${r.email}"`,
        `"${r.phone}"`,
        `"${r.position}"`,
        `"${r.roles}"`,
        `"${r.organizations}"`,
        `"${r.status}"`,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function Users() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { isGlobalSuperAdmin, organizationId, permissions } = useUser();
  const { data: teamUsers = [], isLoading, error } = useTeamUsers();

  // מי יכול לנהל משתמשים (להוסיף/לערוך)
  const canManageUsers =
    permissions.manage_users || isGlobalSuperAdmin;

  /* ---------- Load organizations (for dialogs) ---------- */
  const { data: orgs = [] } = useQuery<OrgLite[]>({
    queryKey: ["users-organizations", isGlobalSuperAdmin, organizationId],
    enabled: isGlobalSuperAdmin || !!organizationId,
    queryFn: async () => {
      let q = supabase.from("organizations").select("id, name");
      if (!isGlobalSuperAdmin && organizationId) {
        q = q.eq("id", organizationId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  /* ---------- Load system roles from roles table ---------- */
  const { data: systemRoles = [] } = useQuery<string[]>({
    queryKey: ["system-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("name")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []).map((r: { name: string }) => r.name);
    },
  });

  /* ---------------- FILTERS ---------------- */

  const [filters, setFilters] = useState({
    searchName: "",
    searchEmail: "",
    searchPhone: "",
    searchPosition: "",
    searchText: "",
    role: "",
    status: "",
  });

  const resetFilters = () =>
    setFilters({
      searchName: "",
      searchEmail: "",
      searchPhone: "",
      searchPosition: "",
      searchText: "",
      role: "",
      status: "",
    });

  /* ---------------- SORT ---------------- */

  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const canEdit = canManageUsers;

  /* ---------- Filter Bar fields (Role + Status) ---------- */

  const uniqueRoles = useMemo(() => {
    const s = new Set<string>();
    teamUsers.forEach((u) => u.roles.forEach((r) => s.add(r.role)));
    return [...s];
  }, [teamUsers]);

  const filterFields = [
    {
      key: "role",
      label: t("users.filters.role"),
      type: "select" as const,
      options: ["", ...uniqueRoles],
    },
    {
      key: "status",
      label: t("users.filters.status"),
      type: "select" as const,
      options: ["", "active", "suspended"],
    },
  ];

  /* ---------------- FILTERING + SORTING ---------------- */

  const filteredUsers = useMemo(() => {
    let list = [...teamUsers];

    // הגבלת משתמשים לפי ארגון
    if (!isGlobalSuperAdmin && organizationId) {
      list = list.filter((u) =>
        u.roles.some((r) => r.organization_id === organizationId)
      );
    } else if (
      isGlobalSuperAdmin &&
      organizationId &&
      organizationId !== "all"
    ) {
      list = list.filter((u) =>
        u.roles.some((r) => r.organization_id === organizationId)
      );
    }

    // structured filters
    if (filters.role) {
      list = list.filter((u) =>
        u.roles.some((r) => r.role === filters.role)
      );
    }
    if (filters.status === "active") {
      list = list.filter((u) => u.roles.some((r) => !r.suspended));
    } else if (filters.status === "suspended") {
      list = list.filter((u) => u.roles.every((r) => r.suspended));
    }

    // text filters
    list = list.filter((u) => {
      const fullName = `${u.first_name || ""} ${
        u.last_name || ""
      }`.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const position = (u.position || "").toLowerCase();
      const blob = `${fullName} ${email} ${phone} ${position} ${u.roles
        .map((r) => r.role)
        .join(" ")}`.toLowerCase();

      if (
        filters.searchName &&
        !fullName.includes(filters.searchName.toLowerCase())
      )
        return false;
      if (
        filters.searchEmail &&
        !email.includes(filters.searchEmail.toLowerCase())
      )
        return false;
      if (
        filters.searchPhone &&
        !phone.includes(filters.searchPhone.toLowerCase())
      )
        return false;
      if (
        filters.searchPosition &&
        !position.includes(filters.searchPosition.toLowerCase())
      )
        return false;
      if (
        filters.searchText &&
        !blob.includes(filters.searchText.toLowerCase())
      )
        return false;

      return true;
    });

    // sorting
    const sorted = [...list].sort((a, b) => {
      const fullNameA = `${a.first_name || ""} ${
        a.last_name || ""
      }`.trim();
      const fullNameB = `${b.first_name || ""} ${
        b.last_name || ""
      }`.trim();

      const mapping: Record<string, [any, any]> = {
        name: [fullNameA.toLowerCase(), fullNameB.toLowerCase()],
        email: [(a.email || "").toLowerCase(), (b.email || "").toLowerCase()],
        phone: [(a.phone || "").toLowerCase(), (b.phone || "").toLowerCase()],
        position: [
          (a.position || "").toLowerCase(),
          (b.position || "").toLowerCase(),
        ],
        status: [
          a.roles.some((r) => !r.suspended),
          b.roles.some((r) => !r.suspended),
        ],
      };

      const [A, B] = mapping[sortField] || mapping["name"];

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [
    teamUsers,
    filters,
    sortField,
    sortDir,
    organizationId,
    isGlobalSuperAdmin,
  ]);

  /* ---------------- PAGINATION ---------------- */

  const pageSize = 25;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filters, sortField]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const pageRows = filteredUsers.slice(start, start + pageSize);

  /* ---------------- EXPORT ---------------- */

  const handleExport = () => {
    const rows = filteredUsers.map((u) => {
      const name =
        `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
        u.email ||
        u.user_id;

      return {
        name,
        email: u.email || "",
        phone: u.phone || "",
        position: u.position || "",
        roles: u.roles.map((r) => r.role).join("; "),
        organizations: u.roles.map((r) => r.organization_name).join("; "),
        status: u.roles.some((r) => !r.suspended)
          ? t("users.status.active")
          : t("users.status.suspended"),
      };
    });

    exportCSV("users.csv", rows);
  };

  /* ---------------- MODALS ---------------- */

  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const openEditDialog = (u: UserWithRoles) => {
    setSelectedUser(u);
    setEditDialogOpen(true);
  };

  /* ---------------- SUMMARY CARDS ---------------- */

  const totalUsers = filteredUsers.length;
  const totalRolesAssigned = filteredUsers.reduce(
    (sum, u) => sum + u.roles.length,
    0
  );
  const rolesBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredUsers.forEach((u) =>
      u.roles.forEach((r) =>
        map.set(r.role, (map.get(r.role) || 0) + 1)
      )
    );
    return [...map.entries()];
  }, [filteredUsers]);

  /* ---------------- PREP FOR ADD USER DIALOG ---------------- */

  const filteredOrgsForAdd = isGlobalSuperAdmin
    ? orgs
    : orgs.filter((o) => o.id === organizationId);

  const filteredRolesForAdd = isGlobalSuperAdmin
    ? systemRoles
    : systemRoles.filter((r) => r !== "super_admin");

  /* ---------------- RENDER ---------------- */

  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* TITLE + ADD USER BUTTON */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("users.title")}
        </h1>

        {canManageUsers && (
          <Button
            className="flex gap-2 items-center"
            onClick={() => setShowAddUser(true)}
          >
            <UserPlus size={16} />
            {t("users.add")}
          </Button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("users.totalUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("users.totalRolesAssigned")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {totalRolesAssigned}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("users.rolesBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {rolesBreakdown.map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <span>{role}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow-sm">
        <FilterBarCompact
          filters={filters}
          fields={filterFields}
          onChange={setFilters}
          onReset={resetFilters}
          onExport={handleExport}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500">
            {(error as Error).message}
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-auto">
              <Table className="w-full text-sm">
                <TableHeader className="sticky top-0 bg-gray-50/80 backdrop-blur z-10">
                  <TableRow>
                    <TableHead
                      onClick={() => toggleSort("name")}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        {t("users.columns.user")}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </TableHead>

                    <TableHead>{t("users.columns.contact")}</TableHead>

                    <TableHead
                      onClick={() => toggleSort("position")}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        {t("users.columns.position")}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </TableHead>

                    <TableHead>{t("users.columns.roles")}</TableHead>

                    <TableHead
                      onClick={() => toggleSort("status")}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        {t("users.columns.status")}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </TableHead>

                    <TableHead className="text-right">
                      {t("users.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.map((u) => {
                    const fullName =
                      `${u.first_name || ""} ${
                        u.last_name || ""
                      }`.trim() ||
                      u.email ||
                      u.user_id;
                    const isActive = u.roles.some(
                      (r) => !r.suspended
                    );

                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <span className="font-medium">
                            {highlight(
                              fullName,
                              filters.searchName || filters.searchText
                            )}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground gap-1">
                            {u.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {highlight(
                                  u.email,
                                  filters.searchEmail || filters.searchText
                                )}
                              </span>
                            )}
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {highlight(
                                  u.phone,
                                  filters.searchPhone || filters.searchText
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {highlight(
                            u.position || "-",
                            filters.searchPosition || filters.searchText
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <Badge
                                key={r.id}
                                variant={r.suspended ? "outline" : "secondary"}
                                className="text-[11px]"
                              >
                                {r.role}
                                {r.organization_name && (
                                  <span className="ml-1 opacity-70 text-[10px]">
                                    ({r.organization_name})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          {isActive ? (
                            <Badge
                              variant="outline"
                              className="text-[11px]"
                            >
                              {t("users.status.active")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="text-[11px]"
                            >
                              {t("users.status.suspended")}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canEdit}
                            onClick={() => openEditDialog(u)}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {t("users.manage")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="p-6 text-center text-gray-500"
                      >
                        {t("users.noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center px-4 py-2 bg-white/80 backdrop-blur border-t text-xs mt-2">
              <div>
                {totalItems > 0 &&
                  `${start + 1}–${Math.min(
                    start + pageSize,
                    totalItems
                  )} / ${totalItems}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  ‹
                </button>

                <span>
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* EDIT USER DIALOG */}
      <EditUserDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        organizations={orgs}
      />

      {/* ADD USER DIALOG */}
      {canManageUsers && (
        <AddUserDialog
          open={showAddUser}
          onClose={(refresh) => {
            setShowAddUser(false);
            if (refresh) {
              queryClient.invalidateQueries({ queryKey: ["team-users"] });
            }
          }}
          organizations={filteredOrgsForAdd}
          roles={filteredRolesForAdd}
          isSuperAdmin={isGlobalSuperAdmin}
          currentOrganizationId={organizationId}
        />
      )}
    </div>
  );
}
