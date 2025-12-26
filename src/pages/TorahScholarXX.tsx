import React, { useMemo, useState, useEffect } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { usePledges } from "@/hooks/usePledges";
import { usePaymentsForPledges } from "@/hooks/usePaymentsForPledges";

import AddScholarSupportDialog from "@/components/AddScholarSupportDialog";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  GraduationCap,
  Users,
  Handshake,
  HandCoins,
  Plus,
  Filter,
  ArrowLeft,
  ArrowRight,
  Building,
} from "lucide-react";

/* ============================================================
   HELPERS
============================================================ */

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string | null | undefined, query: string) {
  if (!text) return "";
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.split(regex).map((part, i) =>
    i % 2 ? (
      <mark key={i} className="bg-yellow-200 text-black rounded px-1">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function fmtDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB");
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function TorahScholarPage() {
  const { t, currency } = useLanguage();
  const { organizationId, isSuperAdmin } = useUser();

  /* --------------------------------------------
     LOAD DATA
  --------------------------------------------- */

  const { data: pledges = [] } = usePledges(organizationId);
  const paymentsQuery = usePaymentsForPledges();

  const payments = paymentsQuery.data?.payments ?? [];

  const scholarPledges = useMemo(
    () => pledges.filter((p: any) => p.category === "torah_scholar"),
    [pledges]
  );

  const scholarPayments = useMemo(
    () =>
      payments.filter((p: any) =>
        scholarPledges.some((pl: any) => pl.id === p.pledge_id)
      ),
    [payments, scholarPledges]
  );

  /* --------------------------------------------
     KPI TOTALS
  --------------------------------------------- */

  const totalDonors = new Set(
    scholarPledges.map((p: any) => p.donor_id)
  ).size;

  const totalSupports = scholarPledges.length;

  const totalPaid = scholarPayments.reduce(
    (sum: number, p: any) => sum + Number(p.amount || 0),
    0
  );

  const totalCommitted = scholarPledges.reduce(
    (sum: number, p: any) => sum + Number(p.total_amount || 0),
    0
  );

  /* --------------------------------------------
     SEARCH + FILTER
  --------------------------------------------- */

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return scholarPledges.filter((p: any) => {
      if (searchText) {
        const hay = [
          p.donor_name,
          p.donor_email,
          p.donor_phone,
          p.notes,
          p.status,
          p.organization_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(searchText.toLowerCase())) return false;
      }

      if (statusFilter && p.status !== statusFilter) return false;

      return true;
    });
  }, [scholarPledges, searchText, statusFilter]);

  /* --------------------------------------------
     SORTING
  --------------------------------------------- */

  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      const A = a[sortKey];
      const B = b[sortKey];

      if (A == null) return 1;
      if (B == null) return -1;

      const valA =
        typeof A === "string" && !isNaN(Date.parse(A))
          ? new Date(A).getTime()
          : A;

      const valB =
        typeof B === "string" && !isNaN(Date.parse(B))
          ? new Date(B).getTime()
          : B;

      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [filtered, sortKey, sortDir]);

  /* --------------------------------------------
     PAGINATION
  --------------------------------------------- */

  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => setPage(1), [searchText, statusFilter]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const pageItems = sorted.slice(startIndex, startIndex + pageSize);

  /* --------------------------------------------
     ADD SUPPORT DIALOG
  --------------------------------------------- */

  const [dialogOpen, setDialogOpen] = useState(false);

  /* --------------------------------------------
     TABLE COLUMNS
  --------------------------------------------- */

  const columns = [
    { key: "donor_name", label: t("torahScholar.donor") || "Donor" },
    ...(isSuperAdmin
      ? [
          {
            key: "organization_name",
            label: t("torahScholar.organization") || "Organization",
          },
        ]
      : []),
    { key: "total_amount", label: t("torahScholar.amountPerPeriod") || "Amount" },
    { key: "amount_paid", label: t("torahScholar.paid") || "Paid" },
    { key: "balance_owed", label: t("torahScholar.balance") || "Balance" },
    { key: "status", label: t("torahScholar.status") || "Status" },
    { key: "due_date", label: t("torahScholar.nextDueDate") || "Next Due" },
    { key: "notes", label: t("torahScholar.notes") || "Notes" },
  ];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-indigo-600" />
          <h1 className="text-3xl font-bold">
            {t("torahScholar.title") || "Torah Scholar Support"}
          </h1>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="flex gap-2">
          <Plus className="w-4 h-4" />
          {t("torahScholar.addSupport") || "Add Support"}
        </Button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5" />
              {t("torahScholar.totalCommitted") || "Total Amount"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {currency} {totalCommitted.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("torahScholar.totalDonors") || "Total Donors"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-blue-700">
            {totalDonors}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5" />
              {t("torahScholar.totalSupports") || "Supports"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-indigo-700">
            {totalSupports}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5" />
              {t("torahScholar.totalPaid") || "Paid"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {currency} {totalPaid.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH + FILTER */}
      <Card className="border bg-white/90 shadow-sm">
        <CardContent className="py-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Input
              placeholder={t("torahScholar.searchPlaceholder") || "Search..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 text-sm">
            {["", "active", "completed", "cancelled"].map((s) => (
              <button
                key={s || "all"}
                className={`px-3 py-1 rounded-full border ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700"
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s === ""
                  ? t("torahScholar.statusAll") || "All"
                  : t(`torahScholar.status${s}`) || s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border glass rounded-xl shadow-md overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <Table className="text-sm">
            <TableHeader className="sticky top-0 bg-gray-50/90 backdrop-blur z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer select-none text-xs font-semibold"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <span>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-gray-50/60">
                  <TableCell>{highlight(p.donor_name, searchText)}</TableCell>

                  {isSuperAdmin && (
                    <TableCell>{highlight(p.organization_name, searchText)}</TableCell>
                  )}

                  <TableCell>
                    {currency} {Number(p.total_amount).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {currency} {Number(p.amount_paid).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    {currency} {Number(p.balance_owed).toLocaleString()}
                  </TableCell>

                  <TableCell>{highlight(p.status, searchText)}</TableCell>

                  <TableCell>{fmtDate(p.due_date)}</TableCell>

                  <TableCell>{highlight(p.notes, searchText)}</TableCell>
                </TableRow>
              ))}

              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-6 text-center">
                    {t("torahScholar.noResults") || "No results"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between px-4 py-3 bg-white border-t text-xs">
          <span>
            {totalItems > 0 &&
              `${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)} / ${totalItems}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border px-2 py-1 rounded disabled:opacity-40 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              {t("common.prev") || "Prev"}
            </button>

            <span>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border px-2 py-1 rounded disabled:opacity-40 flex items-center gap-1"
            >
              {t("common.next") || "Next"}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </Card>

      {/* ADD SUPPORT DIALOG */}
      <AddScholarSupportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
