// src/pages/Donations.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useAllDonations } from "@/hooks/useDonations";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import FilterBarCompact from "@/components/FilterBarCompact";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpDown, HandHeart as UserIcon } from "lucide-react";

/* ---------------------------------------------------- */
/* helpers */
/* ---------------------------------------------------- */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string | null | undefined, query: string) {
  if (!text || !query) return text || "";
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

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB");
};

/* ---------------------------------------------------- */
/* component */
/* ---------------------------------------------------- */
export default function DonationsPage() {
  const { t, currency } = useLanguage();
  const { isGlobalSuperAdmin, organizationId } = useUser();
  const fallbackCurrency = currency || "ILS";

  const { data: donationsRaw = [] } = useAllDonations();

  const showOrgCol = isGlobalSuperAdmin && organizationId === "all";

  /* ---------------------------------------------------- */
  /* LOAD ORG CURRENCIES (settings.default_currency)      */
  /* ---------------------------------------------------- */
  const { data: orgSettingsList = [] } = useQuery({
    queryKey: ["all-org-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");

      if (error) throw error;
      return data || [];
    },
  });

  const orgCurrencyMap = useMemo(() => {
    const map = new Map<string, string>();
    (orgSettingsList as any[]).forEach((s) => {
      if (s.organization_id) {
        map.set(
          s.organization_id,
          s.default_currency || fallbackCurrency
        );
      }
    });
    return map;
  }, [orgSettingsList, fallbackCurrency]);

  /* filters state */
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    type: "",
    method: "",
    campaign: "",
    searchName: "",
    searchPhone: "",
    searchEmail: "",
    searchText: "",
  });

  const resetFilters = () =>
    setFilters({
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      type: "",
      method: "",
      campaign: "",
      searchName: "",
      searchPhone: "",
      searchEmail: "",
      searchText: "",
    });

  /* campaign options */
  const campaignOptions = Array.from(
    new Set(donationsRaw.map((d: any) => d.campaign_name).filter(Boolean))
  );

  /* filter bar fields */
  const filterFields = [
    { key: "dateFrom", label: t("filters.dateFrom"), type: "date" },
    { key: "dateTo", label: t("filters.dateTo"), type: "date" },
    { key: "minAmount", label: t("filters.minAmount"), type: "number" },
    { key: "maxAmount", label: t("filters.maxAmount"), type: "number" },
    {
      key: "type",
      label: t("filters.type"),
      type: "select",
      options: ["Regular", "Other"],
    },
    {
      key: "method",
      label: t("filters.method"),
      type: "select",
      options: ["Cash", "Transfer", "Credit Card", "Check"],
    },
    {
      key: "campaign",
      label: t("filters.campaign"),
      type: "select",
      options: campaignOptions,
    },
  ];

  /* ---------------------------------------------------- */
  /* apply filters */
  /* ---------------------------------------------------- */
  const filtered = useMemo(() => {
    return donationsRaw.filter((d: any) => {
      const q = filters.searchText.toLowerCase();

      const haystack = [
        d.donor_name,
        d.donor_email,
        d.donor_phone,
        d.type,
        d.payment_method,
        d.notes,
        d.campaign_name,
        d.organization_name ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (filters.searchText && !haystack.includes(q)) return false;

      if (filters.searchName) {
        if (
          !d.donor_name?.toLowerCase().includes(filters.searchName.toLowerCase())
        )
          return false;
      }

      if (filters.searchPhone) {
        if (!d.donor_phone?.includes(filters.searchPhone)) return false;
      }

      if (filters.searchEmail) {
        if (
          !d.donor_email?.toLowerCase().includes(filters.searchEmail.toLowerCase())
        )
          return false;
      }

      if (filters.dateFrom && d.date < filters.dateFrom) return false;
      if (filters.dateTo && d.date > filters.dateTo) return false;

      if (filters.minAmount && d.amount < Number(filters.minAmount)) return false;
      if (filters.maxAmount && d.amount > Number(filters.maxAmount)) return false;

      if (filters.type && d.type !== filters.type) return false;
      if (filters.method && d.payment_method !== filters.method) return false;
      if (filters.campaign && d.campaign_name !== filters.campaign) return false;

      return true;
    });
  }, [donationsRaw, filters]);

  /* ---------------------------------------------------- */
  /* TOTALS BY CURRENCY (FOR SUMMARY CARD)                */
  /* ---------------------------------------------------- */
  const totalAmountByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    (filtered as any[]).forEach((d) => {
      const orgId = d.organization_id as string | undefined;
      const amount = Number(d.amount || 0);
      const cur =
        (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;
      totals[cur] = (totals[cur] || 0) + amount;
    });
    return totals;
  }, [filtered, orgCurrencyMap, fallbackCurrency]);

  const totalDonors = useMemo(
    () => new Set(filtered.map((d: any) => d.donor_id)).size,
    [filtered]
  );

  /* ---------------------------------------------------- */
  /* sorting */
  /* ---------------------------------------------------- */
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    setSortField((p) => (p === field ? p : field));
    setSortDir((prev) =>
      sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"
    );
  };

  const sorted = useMemo(() => {
    if (!sortField) return filtered;

    return [...filtered].sort((a: any, b: any) => {
      const A = a[sortField];
      const B = b[sortField];

      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;

      if (sortField === "amount") {
        return sortDir === "asc"
          ? Number(A) - Number(B)
          : Number(B) - Number(A);
      }

      if (sortField === "date") {
        return sortDir === "asc"
          ? new Date(A).getTime() - new Date(B).getTime()
          : new Date(B).getTime() - new Date(A).getTime();
      }

      const sA = String(A).toLowerCase();
      const sB = String(B).toLowerCase();

      if (sA < sB) return sortDir === "asc" ? -1 : 1;
      if (sA > sB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  /* pagination */
  const pageSize = 25;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filters, sortField, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + pageSize);

  /* ---------------------------------------------------- */
  /* EXPORT CSV                                           */
  /* ---------------------------------------------------- */
  const handleExport = () => {
    const header = [
      "Name",
      "Phone",
      "Email",
      "Amount",
      "Date",
      "Type",
      "Method",
      "Campaign",
      "Notes",
      ...(showOrgCol ? ["Organization"] : []),
    ];

    const rows = filtered.map((d: any) => {
      const orgId = d.organization_id as string | undefined;
      const cur =
        (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;

      return [
        d.donor_name,
        d.donor_phone,
        d.donor_email,
        `${cur} ${d.amount}`,
        d.date,
        d.type,
        d.payment_method,
        d.campaign_name,
        (d.notes || "").replace(/"/g, '""'),
        ...(showOrgCol ? [d.organization_name || ""] : []),
      ];
    });

    const csv =
      [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "donations.csv";
    a.click();
  };

  /* ---------------------------------------------------- */
  /* RENDER                                               */
  /* ---------------------------------------------------- */
  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserIcon className="w-5 h-5" />
        {t("donations.title")}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{t("donations.totalAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 space-y-1">
              {Object.keys(totalAmountByCurrency).length > 0 ? (
                Object.entries(totalAmountByCurrency).map(([cur, amt]) => (
                  <div key={cur}>
                    {cur} {Number(amt).toLocaleString()}
                  </div>
                ))
              ) : (
                <div>
                  {fallbackCurrency} 0
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{t("donations.totalDonors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totalDonors}
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{t("donations.totalCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="border bg-white/80 backdrop-blur rounded-xl shadow-sm">
        <FilterBarCompact
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onExport={handleExport}
          fields={filterFields}
        />
      </div>

      {/* TABLE */}
      <div className="border rounded-xl bg-white/80 backdrop-blur shadow overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 backdrop-blur sticky top-0 z-10">
              <tr>
                {[
                  ["donor_name", t("donations.name")],
                  ["donor_phone", t("donations.phone")],
                  ["donor_email", t("donations.email")],
                  ...(showOrgCol
                    ? [["organization_name", "Organization"] as any]
                    : []),
                  ["amount", t("donations.amount")],
                  ["date", t("donations.date")],
                  ["type", t("donations.type")],
                  ["payment_method", t("donations.method")],
                  ["campaign_name", t("donations.campaign")],
                  ["notes", t("donations.notes")],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    className="p-3 cursor-pointer hover:bg-gray-100 text-left text-xs font-semibold text-gray-700 border-b"
                    onClick={() => toggleSort(field)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pageItems.map((d: any) => {
                const orgId = d.organization_id as string | undefined;
                const cur =
                  (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;

                return (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      {highlight(d.donor_name, filters.searchText)}
                    </td>
                    <td className="p-3">
                      {highlight(d.donor_phone, filters.searchText)}
                    </td>
                    <td className="p-3">
                      {highlight(d.donor_email, filters.searchText)}
                    </td>

                    {showOrgCol && (
                      <td className="p-3">
                        {highlight(d.organization_name, filters.searchText)}
                      </td>
                    )}

                    <td className="p-3">
                      {cur} {Number(d.amount).toLocaleString()}
                    </td>

                    <td className="p-3">{fmtDate(d.date)}</td>
                    <td className="p-3">{d.type}</td>
                    <td className="p-3">{d.payment_method}</td>
                    <td className="p-3">{d.campaign_name}</td>
                    <td className="p-3 max-w-[200px] truncate">
                      {d.notes}
                    </td>
                  </tr>
                );
              })}

              {pageItems.length === 0 && (
                <tr>
                  <td
                    colSpan={showOrgCol ? 10 : 9}
                    className="p-6 text-center text-gray-500"
                  >
                    {t("donations.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white/80 backdrop-blur text-xs text-gray-600">
          <span>
            {startIdx + 1}–
            {Math.min(startIdx + pageSize, totalItems)} / {totalItems}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>

            <span>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
