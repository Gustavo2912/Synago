import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useDonors } from "@/hooks/useDonors";
import { useAllDonations } from "@/hooks/useDonations";
import { usePledges } from "@/hooks/usePledges";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import DonorProfile from "./DonorProfile";
import AddDonorDialog from "@/components/AddDonorDialog";
import EditDonorDialog from "@/components/EditDonorDialog";

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
import { ArrowUpDown, UserPlus, Users as UserIcon } from "lucide-react";
import FilterBarCompact from "@/components/FilterBarCompact";

/* ---------------- HELPERS ---------------- */
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

/* ---------------- EXPORT CSV ---------------- */
function exportCSV(filename: string, rows: any[]) {
  const headers = [
    "Name",
    "Phone",
    "Email",
    "Organizations",
    "Created At",
    "Last Donation Amount",
    "Last Donation Date",
    "Total Donated",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((d) =>
      [
        `"${d.name}"`,
        `"${d.phone}"`,
        `"${d.email}"`,
        `"${d.organizations}"`,
        `"${d.created}"`,
        `"${d.lastDonationAmount}"`,
        `"${d.lastDonationDate}"`,
        `"${d.totalDonated}"`,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function Donors() {
  const { t, currency } = useLanguage();
  const { organizationId } = useUser();
  const fallbackCurrency = currency || "ILS";

  const [filters, setFilters] = useState({
    searchText: "",
    searchName: "",
    searchPhone: "",
    searchEmail: "",
    minTotal: "",
    maxTotal: "",
  });

  const resetFilters = () =>
    setFilters({
      searchText: "",
      searchName: "",
      searchPhone: "",
      searchEmail: "",
      minTotal: "",
      maxTotal: "",
    });

  /* ---------------- LOAD DATA ---------------- */

  const { data: donorsRaw = [] } = useDonors({
    search: filters.searchText,
    organizationId,
  });

  const { data: donationsRaw = [] } = useAllDonations({}, organizationId);
  const { data: pledgesRaw = [] } = usePledges(organizationId);

  const donations = donationsRaw;
  const pledges = pledgesRaw;

  /* ---------------- LOAD ORG CURRENCIES ----------------
     טוען את default_currency של כל ארגון מטבלת settings
  ------------------------------------------------------ */
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

  /* ---------------- DONATION STATS PER DONOR ----------------
     totalsByCurrency: { [currency]: totalAmount }
     lastDonation:     { amount, currency, date }
  ----------------------------------------------------------- */
  const donorDonationStats = useMemo(() => {
    type TotalsByCurrency = Record<string, number>;
    type LastDonation = { amount: number; currency: string; date: string };
    const map = new Map<
      string,
      { totalsByCurrency: TotalsByCurrency; lastDonation?: LastDonation }
    >();

    (donations as any[]).forEach((d) => {
      const donorId = d.donor_id;
      if (!donorId) return;

      const orgId = d.organization_id as string | undefined;
      const amount = Number(d.amount || 0);
      const dateStr = (d.date || d.created_at) as string | undefined;
      const cur =
        (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;

      let stat = map.get(donorId);
      if (!stat) {
        stat = { totalsByCurrency: {} };
        map.set(donorId, stat);
      }

      // totals by currency
      stat.totalsByCurrency[cur] =
        (stat.totalsByCurrency[cur] || 0) + amount;

      // last donation
      if (dateStr) {
        const curDate = new Date(dateStr);
        if (
          !stat.lastDonation ||
          new Date(stat.lastDonation.date) < curDate
        ) {
          stat.lastDonation = { amount, currency: cur, date: dateStr };
        }
      }
    });

    return map;
  }, [donations, orgCurrencyMap, fallbackCurrency]);

  /* ---------------- TOTALS BY CURRENCY (ALL DONATIONS / PLEDGES) ---------------- */
  const totalAmountDonatedByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    (donations as any[]).forEach((d) => {
      const orgId = d.organization_id as string | undefined;
      const amount = Number(d.amount || 0);
      const cur =
        (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;
      totals[cur] = (totals[cur] || 0) + amount;
    });
    return totals;
  }, [donations, orgCurrencyMap, fallbackCurrency]);

  const totalAmountPledgedByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    (pledges as any[]).forEach((p) => {
      const orgId = p.organization_id as string | undefined;
      const amount = Number(p.total_amount || 0);
      const cur =
        (orgId && orgCurrencyMap.get(orgId)) || fallbackCurrency;
      totals[cur] = (totals[cur] || 0) + amount;
    });
    return totals;
  }, [pledges, orgCurrencyMap, fallbackCurrency]);

  /* ---------------- MODALS ---------------- */
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDonorForProfile, setSelectedDonorForProfile] = useState<any>(
    null
  );

  const [showAddDonor, setShowAddDonor] = useState(false);
  const [selectedDonorForEdit, setSelectedDonorForEdit] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  const openProfile = (d: any) => {
    setSelectedDonorForProfile(d);
    setProfileOpen(true);
  };

  const openEdit = (d: any) => {
    setSelectedDonorForEdit(d);
    setShowEdit(true);
  };

  /* ---------------- NORMALIZE ---------------- */
  const getDonorName = (d: any) => {
    if (d.display_name) return d.display_name;
    const full = `${d.first_name || ""} ${d.last_name || ""}`.trim();
    return full || d.email || d.phone || "-";
  };

  /* ---------------- FILTER BAR FIELDS ---------------- */
  const filterFields = [
    {
      key: "minTotal",
      label: t("donors.minTotal") || "Min Total",
      type: "number",
    },
    {
      key: "maxTotal",
      label: t("donors.maxTotal") || "Max Total",
      type: "number",
    },
  ];

  /* ---------------- FILTER LOGIC ---------------- */
  const donorsFiltered = useMemo(() => {
    return donorsRaw.filter((d: any) => {
      const name = getDonorName(d).toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      const total = Number(d.total_donations || 0);

      if (
        filters.searchName &&
        !name.includes(filters.searchName.toLowerCase())
      )
        return false;

      if (
        filters.searchPhone &&
        !phone.includes(filters.searchPhone.toLowerCase())
      )
        return false;

      if (
        filters.searchEmail &&
        !email.includes(filters.searchEmail.toLowerCase())
      )
        return false;

      if (filters.minTotal && total < Number(filters.minTotal)) return false;
      if (filters.maxTotal && total > Number(filters.maxTotal)) return false;

      return true;
    });
  }, [donorsRaw, filters]);

  /* ---------------- SORTING ---------------- */
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedDonors = useMemo(() => {
    if (!sortField) return donorsFiltered;

    return [...donorsFiltered].sort((a: any, b: any) => {
      const mapping: any = {
        name: () => [getDonorName(a).toLowerCase(), getDonorName(b).toLowerCase()],
        phone: () => [(a.phone || "").toLowerCase(), (b.phone || "").toLowerCase()],
        email: () => [(a.email || "").toLowerCase(), (b.email || "").toLowerCase()],
        created_at: () => [a.created_at || "", b.created_at || ""],
        last_donation_date: () => [
          a.last_donation_date || "",
          b.last_donation_date || "",
        ],
        total_donations: () => [
          Number(a.total_donations || 0),
          Number(b.total_donations || 0),
        ],
      };

      const [A, B] = mapping[sortField]();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [donorsFiltered, sortField, sortDir]);

  /* ---------------- PAGINATION ---------------- */
  const pageSize = 25;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filters, sortField]);

  const totalItems = sortedDonors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = sortedDonors.slice(start, start + pageSize);

  /* ---------------- SUMMARY ---------------- */
  const totalDonors = donorsFiltered.length;
  const totalDonations = donations.length;
  const totalPledges = pledges.length;

  /* ---------------- EXPORT CSV ---------------- */
  const handleExport = () => {
    const csvData = sortedDonors.map((d: any) => {
      const stats = donorDonationStats.get(d.id);
      const totalsStr = stats
        ? Object.entries(stats.totalsByCurrency)
            .map(
              ([cur, amt]) =>
                `${cur} ${Number(amt).toLocaleString()}`
            )
            .join(" | ")
        : "";

      const lastDonationAmountStr = stats?.lastDonation
        ? `${stats.lastDonation.currency} ${Number(
            stats.lastDonation.amount
          ).toLocaleString()}`
        : "";

      const lastDonationDateStr = stats?.lastDonation
        ? fmtDate(stats.lastDonation.date)
        : "";

      return {
        name: getDonorName(d),
        phone: d.phone || "",
        email: d.email || "",
        organizations: (d.organizations || [])
          .map((o: any) => o?.name)
          .join(", "),
        created: fmtDate(d.created_at),
        lastDonationAmount: lastDonationAmountStr,
        lastDonationDate: lastDonationDateStr,
        totalDonated: totalsStr,
      };
    });

    exportCSV("donors.csv", csvData);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">
      {/* TITLE */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("donors.title") || "Donors"}
        </h1>

        <Button
          onClick={() => setShowAddDonor(true)}
          className="flex gap-2 items-center"
        >
          <UserPlus size={16} />
          {t("donors.add")}
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("donors.totalDonors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalDonors}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("donors.totalAmountDonated")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 space-y-1">
              {Object.keys(totalAmountDonatedByCurrency).length > 0 ? (
                Object.entries(totalAmountDonatedByCurrency).map(
                  ([cur, amt]) => (
                    <div key={cur}>
                      {cur} {Number(amt).toLocaleString()}
                    </div>
                  )
                )
              ) : (
                <div>
                  {fallbackCurrency} 0
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t("donors.totalDonations")}: {totalDonations}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("donors.totalAmountPledged")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 space-y-1">
              {Object.keys(totalAmountPledgedByCurrency).length > 0 ? (
                Object.entries(totalAmountPledgedByCurrency).map(
                  ([cur, amt]) => (
                    <div key={cur}>
                      {cur} {Number(amt).toLocaleString()}
                    </div>
                  )
                )
              ) : (
                <div>
                  {fallbackCurrency} 0
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t("donors.totalPledges")}: {totalPledges}
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
                  ["name", t("donors.displayName")],
                  ["phone", t("donors.phone")],
                  ["email", t("donors.email")],
                  ["organizations", t("donors.organization")],
                  ["created_at", t("donors.createdAt")],
                  ["last_donation_date", t("donors.lastDonation")],
                  ["total_donations", t("donors.totalDonated")],
                  ["actions", t("common.actions")],
                ].map(([key, label]) => (
                  <TableHead
                    key={key}
                    className="p-3 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      key !== "organizations" &&
                      key !== "actions" &&
                      toggleSort(key)
                    }
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key !== "organizations" &&
                        key !== "actions" && (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((donor: any) => {
                const name = getDonorName(donor);
                const phone = donor.phone || "-";
                const email = donor.email || "-";
                const created = fmtDate(donor.created_at);

                const stats = donorDonationStats.get(donor.id);
                const lastDonation = stats?.lastDonation;
                const totalsByCurrency = stats?.totalsByCurrency || {};

                return (
                  <TableRow
                    key={donor.id}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell onClick={() => openProfile(donor)}>
                      {highlight(name, filters.searchName || filters.searchText)}
                    </TableCell>

                    <TableCell onClick={() => openProfile(donor)}>
                      {highlight(
                        phone,
                        filters.searchPhone || filters.searchText
                      )}
                    </TableCell>

                    <TableCell onClick={() => openProfile(donor)}>
                      {highlight(
                        email,
                        filters.searchEmail || filters.searchText
                      )}
                    </TableCell>

                    <TableCell onClick={() => openProfile(donor)}>
                      {(donor.organizations || [])
                        .map((o: any) => o?.name)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>

                    <TableCell onClick={() => openProfile(donor)}>
                      {created}
                    </TableCell>

                    {/* LAST DONATION (amount + date, במטבע של הארגון) */}
                    <TableCell onClick={() => openProfile(donor)}>
                      {lastDonation ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {lastDonation.currency}{" "}
                            {Number(lastDonation.amount).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {fmtDate(lastDonation.date)}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    {/* TOTAL DONATED – לפי מטבע לכל ארגון */}
                    <TableCell onClick={() => openProfile(donor)}>
                      {Object.keys(totalsByCurrency).length > 0 ? (
                        <div className="flex flex-col">
                          {Object.entries(totalsByCurrency).map(
                            ([cur, amt]) => (
                              <span key={cur}>
                                {cur} {Number(amt).toLocaleString()}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="text-right"
                    >
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => openProfile(donor)}>
                          {t("common.manage")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(donor)}
                        >
                          {t("common.edit")}
                        </Button>
                      </div>
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
                    {t("donors.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between px-4 py-2 bg-white/80 backdrop-blur border-t text-xs">
          <div>
            {totalItems > 0 &&
              `${start + 1}–${Math.min(
                start + pageSize,
                totalItems
              )} / ${totalItems}`}
          </div>

          <div className="flex gap-2 items-center">
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
      </div>

      {/* PROFILE */}
      <DonorProfile
        donor={selectedDonorForProfile}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* ADD */}
      <AddDonorDialog
        open={showAddDonor}
        onClose={() => setShowAddDonor(false)}
      />

      {/* EDIT */}
      <EditDonorDialog
        donor={selectedDonorForEdit}
        open={showEdit}
        onClose={() => setShowEdit(false)}
      />
    </div>
  );
}
