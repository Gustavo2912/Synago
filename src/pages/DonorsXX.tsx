import { useState, useMemo, useEffect } from "react";
import { useDonors } from "@/hooks/useDonors";
import { useAllDonations } from "@/hooks/useDonations";
import { usePledges } from "@/hooks/usePledges";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";   // ⬅️ חדש

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
  const { organizationId, isGlobalSuperAdmin } = useUser();  // ⬅️ חדש

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
    organizationId,                     // ⬅️ חדש
  });

  const { data: donationsRaw = [] } = useAllDonations({
    organizationId,                     // ⬅️ חדש
  });

  const { data: pledgesRaw = [] } = usePledges({
    organizationId,                     // ⬅️ חדש
  });

  /* Filter donations/pledges here if hook doesn't support it yet */
  const donations =
    organizationId === "all"
      ? donationsRaw
      : donationsRaw.filter((d: any) => d.organization_id === organizationId);

  const pledges =
    organizationId === "all"
      ? pledgesRaw
      : pledgesRaw.filter((p: any) => p.organization_id === organizationId);

  /* ---------------- MODALS ---------------- */
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDonorForProfile, setSelectedDonorForProfile] = useState<any>(null);

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
    { key: "minTotal", label: t("donors.minTotal") || "Min Total", type: "number" },
    { key: "maxTotal", label: t("donors.maxTotal") || "Max Total", type: "number" },
  ];

  /* ---------------- FILTER LOGIC ---------------- */
  const donorsFiltered = useMemo(() => {
    return donorsRaw.filter((d: any) => {
      const name = getDonorName(d).toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      const total = Number(d.total_donations || 0);

      if (filters.searchName && !name.includes(filters.searchName.toLowerCase()))
        return false;
      if (filters.searchPhone && !phone.includes(filters.searchPhone.toLowerCase()))
        return false;
      if (filters.searchEmail && !email.includes(filters.searchEmail.toLowerCase()))
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
        last_donation_date: () => [a.last_donation_date || "", b.last_donation_date || ""],
        total_donations: () =>
          [Number(a.total_donations || 0), Number(b.total_donations || 0)],
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
  const totalAmountDonated = donations.reduce(
    (sum: number, d: any) => sum + Number(d.amount || 0),
    0
  );
  const totalDonations = donations.length;

  const totalAmountPledged = pledges.reduce(
    (sum: number, p: any) => sum + Number(p.total_amount || 0),
    0
  );
  const totalPledges = pledges.length;

  /* ---------------- EXPORT CSV HANDLER ---------------- */
  const handleExport = () => {
    const csvData = sortedDonors.map((d: any) => ({
      name: getDonorName(d),
      phone: d.phone || "",
      email: d.email || "",
      organizations: (d.organizations || []).map((o: any) => o?.name).join(", "),
      created: fmtDate(d.created_at),
      lastDonationAmount: d.last_donation_amount || "",
      lastDonationDate: fmtDate(d.last_donation_date),
      totalDonated: Number(d.total_donations || 0),
    }));

    exportCSV("donors.csv", csvData);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="p-6 space-y-6 bg-slate-50/80 min-h-screen">

      {/* TITLE + ADD */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {t("donors.title") || "Donors"}
        </h1>

        <Button onClick={() => setShowAddDonor(true)} className="flex gap-2 items-center">
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
            <div className="text-3xl font-bold text-blue-700">{totalDonors}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur shadow-sm border">
          <CardHeader>
            <CardTitle>{t("donors.totalAmountDonated")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {currency} {totalAmountDonated.toLocaleString()}
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
            <div className="text-3xl font-bold text-purple-700">
              {currency} {totalAmountPledged.toLocaleString()}
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
                const lastDonationDate = fmtDate(donor.last_donation_date);
                const lastDonationAmount = donor.last_donation_amount ?? null;
                const totalDonated = Number(donor.total_donations || 0);

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

                    <TableCell onClick={() => openProfile(donor)}>
                      {lastDonationDate ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {currency}{" "}
                            {Number(lastDonationAmount || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {lastDonationDate}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell onClick={() => openProfile(donor)}>
                      {currency} {totalDonated.toLocaleString()}
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
              `${start + 1}–${Math.min(start + pageSize, totalItems)} / ${totalItems}`}
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
      <AddDonorDialog open={showAddDonor} onClose={() => setShowAddDonor(false)} />

      {/* EDIT */}
      <EditDonorDialog
        donor={selectedDonorForEdit}
        open={showEdit}
        onClose={() => setShowEdit(false)}
      />
    </div>
  );
}
