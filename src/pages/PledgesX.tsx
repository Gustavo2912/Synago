// src/pages/Pledges.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePledges } from "@/hooks/usePledges";
import { useUser } from "@/contexts/UserContext";
import FilterBarCompact from "@/components/FilterBarCompact";
import { exportCSV } from "@/utils/exportCSV";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpDown, Handshake as UserIcon } from "lucide-react";

/* -------------------------------------------------------
   UTILS
------------------------------------------------------- */
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

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB");
}

/* -------------------------------------------------------
   PAGE COMPONENT
------------------------------------------------------- */
export default function PledgesPage() {
  const { t, currency } = useLanguage();
  const { isGlobalSuperAdmin, organizationId } = useUser();
  const { data: pledges = [] } = usePledges();

  const showOrgColumn = isGlobalSuperAdmin && organizationId === "all";

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    status: "",
    campaign: "",
    searchText: "",
    searchName: "",
    searchPhone: "",
    searchEmail: "",
  });

  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const campaignOptions = Array.from(
    new Set(pledges.map((p: any) => p.campaign_name).filter(Boolean))
  );

  /* -------------------------------------------------------
     FILTER BAR FIELDS
  ------------------------------------------------------- */
  const filterFields = [
    { key: "dateFrom", label: t("pledges.dateFrom"), type: "date" },
    { key: "dateTo", label: t("pledges.dateTo"), type: "date" },
    { key: "minAmount", label: t("pledges.minAmount"), type: "number" },
    { key: "maxAmount", label: t("pledges.maxAmount"), type: "number" },
    {
      key: "status",
      label: t("pledges.status"),
      type: "select",
      options: ["active", "completed", "cancelled"],
    },
    {
      key: "campaign",
      label: t("pledges.campaign"),
      type: "select",
      options: campaignOptions,
    },
  ];

  const resetFilters = () =>
    setFilters({
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      status: "",
      campaign: "",
      searchText: "",
      searchName: "",
      searchPhone: "",
      searchEmail: "",
    });

  /* -------------------------------------------------------
     FILTER LOGIC
  ------------------------------------------------------- */
  const filtered = useMemo(() => {
    return pledges.filter((p: any) => {
      const text = filters.searchText.toLowerCase();

      if (filters.searchText) {
        const hay = [
          p.notes,
          p.donor_name,
          p.donor_email,
          p.donor_phone,
          p.status,
          p.campaign_name,
          p.organization_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(text)) return false;
      }

      if (filters.searchName) {
        if (
          !p.donor_name
            ?.toLowerCase()
            .includes(filters.searchName.toLowerCase())
        )
          return false;
      }

      if (filters.searchPhone) {
        if (!p.donor_phone?.includes(filters.searchPhone)) return false;
      }

      if (filters.searchEmail) {
        if (
          !p.donor_email
            ?.toLowerCase()
            .includes(filters.searchEmail.toLowerCase())
        )
          return false;
      }

      if (filters.dateFrom && p.due_date < filters.dateFrom) return false;
      if (filters.dateTo && p.due_date > filters.dateTo) return false;

      const tot = Number(p.total_amount || 0);
      if (filters.minAmount && tot < Number(filters.minAmount)) return false;
      if (filters.maxAmount && tot > Number(filters.maxAmount)) return false;

      if (filters.status && p.status !== filters.status) return false;

      if (filters.campaign && p.campaign_name !== filters.campaign) return false;

      return true;
    });
  }, [pledges, filters]);

  /* -------------------------------------------------------
     SORT LOGIC
  ------------------------------------------------------- */
  const sorted = useMemo(() => {
    if (!sortField) return filtered;

    return [...filtered].sort((a: any, b: any) => {
      const A = a[sortField] ?? "";
      const B = b[sortField] ?? "";

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* -------------------------------------------------------
     PAGINATION
  ------------------------------------------------------- */
  useEffect(() => setPage(1), [filters, sortField, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(startIndex, startIndex + pageSize);

  const next = () => currentPage < totalPages && setPage(currentPage + 1);
  const prev = () => currentPage > 1 && setPage(currentPage - 1);

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */
  const totalAmount = filtered.reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );
  const totalPaid = filtered.reduce(
    (sum, p) => sum + Number(p.amount_paid || 0),
    0
  );
  const totalBalance = filtered.reduce(
    (sum, p) => sum + Number(p.balance_owed || 0),
    0
  );
  const totalPledges = filtered.length;
  const totalDonors = new Set(filtered.map((p) => p.donor_id)).size;

  /* -------------------------------------------------------
     TABLE COLUMNS
  ------------------------------------------------------- */
  const columns: [string, string][] = [
    ["donor_name", t("pledges.donor")],
    ["donor_phone", t("donors.phone")],
    ["donor_email", t("donors.email")],
  ];

  if (showOrgColumn) {
    columns.push(["organization_name", t("pledges.organization")]);
  }

  columns.push(
    ["total_amount", t("pledges.amountPerPledge")], // שם חדש
    ["amount_paid", t("pledges.paid")],
    ["balance_owed", t("pledges.balance")],
    ["due_date", t("pledges.dueDate")],
    ["category", t("pledges.category")],
    ["campaign_name", t("pledges.campaign")],
    ["status", t("pledges.status")]
  );

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserIcon className="w-5 h-5" />
        {t("pledges.title")}
      </h1>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("pledges.totalAmount")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-700">
            {currency} {totalAmount.toLocaleString()}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("pledges.uniqueDonors")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-purple-700">
            {totalDonors}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("pledges.total")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-gray-700">
            {totalPledges}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("pledges.amountPaid")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-700">
            {currency} {totalPaid.toLocaleString()}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>{t("pledges.balanceOwed")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-700">
            {currency} {totalBalance.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="border border-white/60 bg-white/80 backdrop-blur-md rounded-xl shadow-sm">
        <FilterBarCompact
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onExport={() => exportCSV("pledges.csv", filtered)}
          fields={filterFields}
        />
      </div>

      {/* TABLE */}
      <div className="border glass rounded-xl shadow-md overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <Table className="text-sm">
            <TableHeader className="sticky top-0 bg-gray-50/80 backdrop-blur z-10">
              <TableRow>
                {columns.map(([field, label]) => (
                  <TableHead
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="cursor-pointer whitespace-nowrap text-xs font-semibold text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((p: any) => (
                <TableRow
                  key={p.id}
                  className="border-b border-gray-200 hover:bg-gray-50/70"
                >
                  {columns.map(([field]) => (
                    <TableCell key={field}>
                      {field === "organization_name"
                        ? p.organization_name || "-"
                        : field === "total_amount"
                        ? `${currency} ${Number(p.total_amount).toLocaleString()}`
                        : highlight(
                            p[field as keyof typeof p],
                            filters.searchText
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-5 text-gray-500"
                  >
                    {t("empty.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between px-4 py-3 bg-white/80 backdrop-blur border-t text-xs">
          <span>
            {totalItems > 0 &&
              `${startIndex + 1}–${Math.min(
                startIndex + pageSize,
                totalItems
              )} / ${totalItems}`}
          </span>

          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={currentPage <= 1}
              className="border px-2 py-1 rounded disabled:opacity-40"
            >
              ‹
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={next}
              disabled={currentPage >= totalPages}
              className="border px-2 py-1 rounded disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
