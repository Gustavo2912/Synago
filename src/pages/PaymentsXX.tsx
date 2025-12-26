import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAllPayments } from "@/hooks/usePayments";
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
import { ArrowUpDown, CreditCard as UserIcon } from "lucide-react";

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */

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

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d ?? "" : dt.toLocaleDateString("en-GB");
}

/* -----------------------------------------------------------
   PAGE COMPONENT
----------------------------------------------------------- */

export default function PaymentsPage() {
  const { t, currency } = useLanguage();
  const { data: payments = [] } = useAllPayments();

  /* -----------------------------------------------------------
     FILTERS
     IMPORTANT: use searchName / searchPhone / searchEmail
     to match Donations / Pledges / FilterBarCompact behavior
  ----------------------------------------------------------- */
  const [filters, setFilters] = useState({
    searchText: "",
    searchName: "",
    searchPhone: "",
    searchEmail: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    method: "",
  });

  const resetFilters = () =>
    setFilters({
      searchText: "",
      searchName: "",
      searchPhone: "",
      searchEmail: "",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      method: "",
    });

  /* FILTERBAR FIELDS (top area only) */
  const filterFields = [
    { key: "dateFrom", label: t("payments.dateFrom"), type: "date" },
    { key: "dateTo", label: t("payments.dateTo"), type: "date" },
    { key: "minAmount", label: t("payments.minAmount"), type: "number" },
    { key: "maxAmount", label: t("payments.maxAmount"), type: "number" },
    {
      key: "method",
      label: t("payments.method"),
      type: "select",
      options: [
        "",
        ...Array.from(new Set(payments.map((p) => p.method).filter(Boolean))),
      ],
    },
  ];

  /* -----------------------------------------------------------
     SORTING
  ----------------------------------------------------------- */
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* -----------------------------------------------------------
     FILTER LOGIC
  ----------------------------------------------------------- */
  const filtered = useMemo(() => {
    return payments.filter((p: any) => {
      const all = `${p.donor_name || ""} ${p.donor_email || ""} ${
        p.donor_phone || ""
      } ${p.notes || ""} ${p.method || ""} ${p.reference_number || ""}`
        .toLowerCase();

      // Global search text
      if (filters.searchText && !all.includes(filters.searchText.toLowerCase()))
        return false;

      // Search by Name
      if (
        filters.searchName &&
        !(p.donor_name || "")
          .toLowerCase()
          .includes(filters.searchName.toLowerCase())
      ) {
        return false;
      }

      // Search by Phone
      if (
        filters.searchPhone &&
        !(p.donor_phone || "")
          .toLowerCase()
          .includes(filters.searchPhone.toLowerCase())
      ) {
        return false;
      }

      // Search by Email
      if (
        filters.searchEmail &&
        !(p.donor_email || "")
          .toLowerCase()
          .includes(filters.searchEmail.toLowerCase())
      ) {
        return false;
      }

      const dval = p.date || p.created_at;
      if (filters.dateFrom && dval < filters.dateFrom) return false;
      if (filters.dateTo && dval > filters.dateTo) return false;

      const amt = Number(p.amount || 0);
      if (filters.minAmount && amt < Number(filters.minAmount)) return false;
      if (filters.maxAmount && amt > Number(filters.maxAmount)) return false;

      if (filters.method && p.method !== filters.method) return false;

      return true;
    });
  }, [payments, filters]);

  /* -----------------------------------------------------------
     SORT LOGIC
  ----------------------------------------------------------- */
  const sorted = useMemo(() => {
    if (!sortField) return filtered;

    return [...filtered].sort((a: any, b: any) => {
      const A = a[sortField];
      const B = b[sortField];

      if (sortField === "amount") {
        return sortDir === "asc" ? A - B : B - A;
      }

      if (sortField === "date") {
        return sortDir === "asc"
          ? new Date(A).getTime() - new Date(B).getTime()
          : new Date(B).getTime() - new Date(A).getTime();
      }

      const sA = String(A || "").toLowerCase();
      const sB = String(B || "").toLowerCase();
      if (sA < sB) return sortDir === "asc" ? -1 : 1;
      if (sA > sB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  /* -----------------------------------------------------------
     PAGINATION
  ----------------------------------------------------------- */
  const pageSize = 25;
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [filters, sortField, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  /* -----------------------------------------------------------
     SUMMARY
  ----------------------------------------------------------- */
  const totalAmount = filtered.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const totalPayments = filtered.length;
  const totalDonors = new Set(filtered.map((p) => p.donor_id)).size;

  /* -----------------------------------------------------------
     EXPORT CSV
  ----------------------------------------------------------- */
  const handleExport = () =>
    exportCSV(
      "payments.csv",
      sorted.map((p) => ({
        donor_name: p.donor_name,
        donor_phone: p.donor_phone,
        donor_email: p.donor_email,
        amount: p.amount,
        date: p.date || p.created_at,
        method: p.method,
        notes: p.notes,
        pledge_total_amount: p.pledge?.total_amount,
        pledge_balance: p.pledge?.balance_owed,
        pledge_due_date: p.pledge?.due_date,
      }))
    );

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserIcon className="w-5 h-5" />
        {t("payments.title") || "Payments"}
      </h1>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur shadow">
          <CardHeader>
            <CardTitle>{t("payments.totalAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {currency} {totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow">
          <CardHeader>
            <CardTitle>{t("payments.uniqueDonors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalDonors}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow">
          <CardHeader>
            <CardTitle>{t("payments.totalPayments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalPayments}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow-sm">
        <FilterBarCompact
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onExport={handleExport}
          fields={filterFields}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white/80 backdrop-blur rounded-xl border shadow overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <Table className="w-full text-sm">
            <TableHeader className="sticky top-0 bg-gray-50/80 backdrop-blur z-10">
              <TableRow>
                {[
                  ["donor_name", t("payments.table.donor")],
                  ["donor_phone", t("payments.phone")],
                  ["donor_email", t("payments.email")],
                  ["amount", t("payments.table.amount")],
                  ["date", t("payments.table.date")],
                  ["method", t("payments.table.method")],
                  ["pledge", t("payments.table.pledge")],
                  ["notes", t("payments.table.notes")],
                ].map(([field, label]) => (
                  <TableHead
                    key={field}
                    className="p-3 text-xs font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      field !== "pledge" && field !== "notes" && toggleSort(field)
                    }
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {field !== "pledge" && field !== "notes" && (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((p) => {
                const paymentDate = p.date || p.created_at;

                return (
                  <TableRow
                    key={p.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    {/* NAME */}
                    <TableCell className="p-3">
                      {highlight(
                        p.donor_name,
                        filters.searchName || filters.searchText
                      )}
                    </TableCell>

                    {/* PHONE */}
                    <TableCell className="p-3">
                      {highlight(
                        p.donor_phone,
                        filters.searchPhone || filters.searchText
                      )}
                    </TableCell>

                    {/* EMAIL */}
                    <TableCell className="p-3">
                      {highlight(
                        p.donor_email,
                        filters.searchEmail || filters.searchText
                      )}
                    </TableCell>

                    {/* AMOUNT */}
                    <TableCell className="p-3">
                      {currency} {Number(p.amount).toLocaleString()}
                    </TableCell>

                    {/* DATE */}
                    <TableCell className="p-3">
                      {fmtDate(paymentDate)}
                    </TableCell>

                    {/* METHOD */}
                    <TableCell className="p-3">
                      {highlight(p.method, filters.searchText)}
                    </TableCell>

                    {/* PLEDGE DETAILS */}
                    <TableCell className="p-3 text-xs leading-tight">
                      {p.pledge ? (
                        <>
                          <div>
                            {t("payments.pledgeTotal")}: {currency}{" "}
                            {Number(p.pledge.total_amount).toLocaleString()}
                          </div>
                          <div>
                            {t("payments.pledgeBalance")}: {currency}{" "}
                            {Number(p.pledge.balance_owed).toLocaleString()}
                          </div>
                          <div>
                            {t("payments.dueDate")}:{" "}
                            {fmtDate(p.pledge.due_date)}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">
                          {t("payments.none")}
                        </span>
                      )}
                    </TableCell>

                    {/* NOTES */}
                    <TableCell className="p-3 max-w-[200px] truncate">
                      {highlight(p.notes, filters.searchText) || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}

              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="p-6 text-center text-gray-500"
                  >
                    {t("payments.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between px-4 py-2 border-t bg-white/80 backdrop-blur text-xs">
          <div>
            {totalItems > 0 &&
              `${start + 1}-${Math.min(
                start + pageSize,
                totalItems
              )} / ${totalItems}`}
          </div>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
            >
              ‹
            </button>

            <span>
              {page} / {totalPages || 1}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-100"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
