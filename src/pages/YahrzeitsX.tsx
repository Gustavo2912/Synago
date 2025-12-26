import React, { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import {
  useYahrzeits,
  useYahrzeitDonations,
  useDeleteYahrzeit,
} from "@/hooks/useYahrzeits";

import { useOrgSettings } from "@/hooks/useOrgSettings";

import AddYahrzeitDialog from "@/components/AddYahrzeitDialog";
import EditYahrzeitDialog from "@/components/EditYahrzeitDialog";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
  Calendar,
  CalendarDays,
  LayoutDashboard,
  UserCircle2,
  Bell,
  BellOff,
  Search,
  ArrowUpDown,
  CalendarPlus,
} from "lucide-react";

/* =======================================================
   Helpers
======================================================= */

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d ?? "";
  return dt.toLocaleDateString("en-GB");
}

function getNextOccurrence(secularDate: string | null | undefined) {
  if (!secularDate) return null;
  const base = new Date(secularDate);
  if (isNaN(base.getTime())) return null;

  const today = new Date();
  const thisYear = today.getFullYear();

  const next = new Date(thisYear, base.getMonth(), base.getDate());
  if (next < new Date(today.toDateString())) {
    next.setFullYear(thisYear + 1);
  }
  return next;
}

function daysDiff(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function highlight(txt: string | null | undefined, q: string) {
  if (!txt) return "";
  if (!q.trim()) return txt;
  return txt.replace(new RegExp(`(${q})`, "gi"), "<mark>$1</mark>");
}

/* =======================================================
   Component
======================================================= */

export default function YahrzeitsPage() {
  const { t } = useLanguage();
  const { isGlobalSuperAdmin, organizationId } = useUser();
  const { data: orgSettings } = useOrgSettings();

  const currency = orgSettings?.defaultCurrency ?? "ILS";

  const { data: yahrzeits = [] } = useYahrzeits();
  const { data: yahrzeitDonations = [] } = useYahrzeitDonations();
  const deleteMutation = useDeleteYahrzeit();

  const [search, setSearch] = useState("");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [selectedForEdit, setSelectedForEdit] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const showOrgColumn = isGlobalSuperAdmin && organizationId === "all";

  /* =======================================================
     Summary Cards
  ======================================================= */

  const totalYahrzeits = yahrzeits.length;

  const upcomingThisMonth = useMemo(() => {
    const m = today.getMonth();
    return yahrzeits.filter((y: any) => {
      const next = getNextOccurrence(y.secular_date);
      return next && next.getMonth() === m;
    }).length;
  }, [yahrzeits]);

  const withReminders = yahrzeits.filter((y: any) => y.reminder_enabled).length;

  const totalDonors = useMemo(() => {
    const set = new Set<string>();
    yahrzeits.forEach((y: any) => {
      if (y.donor_id) set.add(y.donor_id);
    });
    return set.size;
  }, [yahrzeits]);

  const totalDonationAmount = yahrzeitDonations.reduce(
    (sum: number, d: any) => sum + Number(d.amount || 0),
    0
  );
  const totalDonationCount = yahrzeitDonations.length;

  /* =======================================================
     Donation Stats by Donor
  ======================================================= */

  const donationStatsByDonor = useMemo(() => {
    const map = new Map<string, any>();

    yahrzeitDonations.forEach((d: any) => {
      const donor = d.donor_id;
      if (!donor) return;

      const amount = Number(d.amount || 0);
      const dateStr = d.date || null;

      const existing = map.get(donor);
      if (!existing) {
        map.set(donor, {
          totalAmount: amount,
          count: 1,
          lastDonationAmount: amount || null,
          lastDonationDate: dateStr,
        });
      } else {
        const newTotal = existing.totalAmount + amount;
        const newCount = existing.count + 1;

        let lastAmount = existing.lastDonationAmount;
        let lastDate = existing.lastDonationDate;

        if (dateStr) {
          const prev = lastDate ? new Date(lastDate) : null;
          const cur = new Date(dateStr);
          if (!prev || cur > prev) {
            lastDate = dateStr;
            lastAmount = amount;
          }
        }

        map.set(donor, {
          totalAmount: newTotal,
          count: newCount,
          lastDonationAmount: lastAmount,
          lastDonationDate: lastDate,
        });
      }
    });

    return map;
  }, [yahrzeitDonations]);

  /* =======================================================
     Filtering
  ======================================================= */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return yahrzeits.filter((y: any) => {
      const haystack = [
        y.deceased_name,
        y.relationship,
        y.donor_name,
        y.donor_email,
        y.donor_phone,
        y.contact_email,
        y.contact_phone,
        y.contact_name,
        y.organization_name,
        y.prayer_text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (!showUpcomingOnly) return true;

      const next = getNextOccurrence(y.secular_date);
      if (!next) return false;

      const diff = daysDiff(todayMidnight, next);
      return diff >= 0 && diff <= 30;
    });
  }, [yahrzeits, search, showUpcomingOnly]);

  /* =======================================================
     Grouping By Month
  ======================================================= */

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();

    filtered.forEach((y: any) => {
      const d = y.secular_date ? new Date(y.secular_date) : null;
      const key = d && !isNaN(d.getTime())
        ? d.toLocaleString("en-GB", { month: "long" })
        : t("yahrzeits.unknownMonth") || "Unknown";

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(y);
    });

    return Array.from(map.entries());
  }, [filtered]);

  /* =======================================================
     Sorting
  ======================================================= */

  const [sortField, setSortField] = useState("secular_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortRows = (rows: any[]) => {
    const arr = [...rows];

    arr.sort((a, b) => {
      let A: any = a[sortField];
      let B: any = b[sortField];

      if (sortField === "secular_date") {
        const dA = A ? new Date(A).getTime() : 0;
        const dB = B ? new Date(B).getTime() : 0;
        return sortDir === "asc" ? dA - dB : dB - dA;
      }

      if (
        sortField === "deceased_name" ||
        sortField === "donor_name" ||
        sortField === "organization_name"
      ) {
        const sA = (A || "").toLowerCase();
        const sB = (B || "").toLowerCase();
        return sortDir === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
      }

      return 0;
    });

    return arr;
  };

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">
              {t("yahrzeits.title") || "Yahrzeits"}
            </h1>

            {isGlobalSuperAdmin && organizationId === "all" && (
              <p className="text-xs text-muted-foreground">
                {t("yahrzeits.scopeAllOrgs") ||
                  "Showing all organizations (super admin)"}
              </p>
            )}
          </div>
        </div>

        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" />
          {t("yahrzeits.addButton") || "Add Yahrzeit"}
        </Button>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              {t("yahrzeits.totalYahrzeits")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{totalYahrzeits}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-green-600" />
              {t("yahrzeits.upcomingThisMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {upcomingThisMonth}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              {t("yahrzeits.withReminders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{withReminders}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCircle2 className="w-4 h-4 text-indigo-600" />
              {t("yahrzeits.totalDonors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{totalDonors}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              {t("yahrzeits.yahrzeitDonations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-700">
              {totalDonationAmount.toLocaleString()} {currency}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalDonationCount} {t("yahrzeits.donationsCount")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <Card className="bg-white shadow-sm border">
        <CardContent className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("yahrzeits.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={showUpcomingOnly}
              onCheckedChange={(v) => setShowUpcomingOnly(Boolean(v))}
            />
            <span className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              {t("yahrzeits.next30DaysToggle")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* GROUPED TABLES */}
      <div className="space-y-4">
        {grouped.length === 0 && (
          <Card className="bg-white shadow-sm border">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("yahrzeits.noResults")}
            </CardContent>
          </Card>
        )}

        {grouped.map(([label, items]) => {
          const rows = sortRows(items);

          return (
            <Card key={label} className="bg-white shadow-sm border">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-purple-600" />
                  {label}
                  <Badge variant="outline" className="ml-2">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        {/* DONOR */}
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => toggleSort("donor_name")}
                        >
                          <div className="flex items-center gap-1">
                            {t("yahrzeits.donor")}
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>

                        {/* ORG (only ALL mode) */}
                        {showOrgColumn && (
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => toggleSort("organization_name")}
                          >
                            <div className="flex items-center gap-1">
                              {t("yahrzeits.organization")}
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                        )}

                        <TableHead>{t("yahrzeits.contact")}</TableHead>

                        <TableHead
                          className="cursor-pointer"
                          onClick={() => toggleSort("deceased_name")}
                        >
                          <div className="flex items-center gap-1">
                            {t("yahrzeits.deceasedName")}
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>

                        <TableHead>{t("yahrzeits.relationship")}</TableHead>

                        <TableHead
                          className="cursor-pointer"
                          onClick={() => toggleSort("secular_date")}
                        >
                          <div className="flex items-center gap-1">
                            {t("yahrzeits.secularDate")}
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>

                        <TableHead>{t("yahrzeits.prayerText")}</TableHead>

                        <TableHead>{t("yahrzeits.donationsColumn")}</TableHead>

                        <TableHead>{t("yahrzeits.reminderColumn")}</TableHead>

                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((y: any) => {
                        const stats =
                          y.donor_id && donationStatsByDonor.get(y.donor_id);

                        const donorIsContact =
                          (y.contact_name || "").trim().toLowerCase() ===
                          (y.donor_name || "").trim().toLowerCase();

                        return (
                          <TableRow key={y.id} className="hover:bg-gray-50">
                            {/* DONOR */}
                            <TableCell>
                              <div
                                className="font-medium"
                                dangerouslySetInnerHTML={{
                                  __html: highlight(y.donor_name, search),
                                }}
                              />

                              <div className="text-xs text-muted-foreground">
                                {y.donor_email && (
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: highlight(
                                        y.donor_email,
                                        search
                                      ),
                                    }}
                                  />
                                )}
                                {y.donor_phone && <div>{y.donor_phone}</div>}
                              </div>
                            </TableCell>

                            {/* ORG */}
                            {showOrgColumn && (
                              <TableCell>
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: highlight(
                                      y.organization_name || "-",
                                      search
                                    ),
                                  }}
                                />
                              </TableCell>
                            )}

                            {/* CONTACT */}
                            <TableCell className="text-xs">
                              {donorIsContact ? (
                                <span className="text-blue-700 font-medium">
                                  {t("yahrzeits.contactSameAsDonor")}
                                </span>
                              ) : (
                                <>
                                  {y.contact_name && (
                                    <div
                                      className="font-medium"
                                      dangerouslySetInnerHTML={{
                                        __html: highlight(
                                          y.contact_name,
                                          search
                                        ),
                                      }}
                                    />
                                  )}
                                  {y.contact_email && (
                                    <div>{y.contact_email}</div>
                                  )}
                                  {y.contact_phone && (
                                    <div>{y.contact_phone}</div>
                                  )}
                                  {!y.contact_name &&
                                    !y.contact_email &&
                                    !y.contact_phone &&
                                    "-"}
                                </>
                              )}
                            </TableCell>

                            {/* DECEASED */}
                            <TableCell
                              dangerouslySetInnerHTML={{
                                __html: highlight(y.deceased_name, search),
                              }}
                            />

                            {/* RELATIONSHIP */}
                            <TableCell>{y.relationship || "-"}</TableCell>

                            {/* DATE */}
                            <TableCell>{fmtDate(y.secular_date)}</TableCell>

                            {/* PRAYER TEXT */}
                            <TableCell className="whitespace-pre-wrap text-xs">
                              {y.prayer_text || "-"}
                            </TableCell>

                            {/* DONATIONS */}
                            <TableCell className="text-xs">
                              <div className="font-semibold">
                                {(stats?.totalAmount || 0).toLocaleString()}{" "}
                                {currency}
                              </div>
                              <div className="text-muted-foreground">
                                {stats?.count || 0} {t("yahrzeits.donations")}
                              </div>

                              {stats?.lastDonationDate && (
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  {(t("yahrzeits.lastDonation") || "Last:") +
                                    " " +
                                    fmtDate(stats.lastDonationDate)}{" "}
                                  {stats.lastDonationAmount != null &&
                                    `(${stats.lastDonationAmount} ${currency})`}
                                </div>
                              )}
                            </TableCell>

                            {/* REMINDER */}
                            <TableCell>
                              {y.reminder_enabled ? (
                                <div className="flex items-center gap-1 text-emerald-600 text-xs">
                                  <Bell className="w-3 h-3" />
                                  {t("yahrzeits.reminderOn")}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <BellOff className="w-3 h-3" />
                                  {t("yahrzeits.reminderOff")}
                                </div>
                              )}
                            </TableCell>

                            {/* ACTIONS */}
                            <TableCell>
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedForEdit(y)}
                                >
                                  {t("common.edit")}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    deleteMutation.mutate(y.id)
                                  }
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DIALOGS */}
      <AddYahrzeitDialog open={showAdd} onClose={() => setShowAdd(false)} />
      <EditYahrzeitDialog
        open={!!selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        yahrzeit={selectedForEdit}
      />
    </div>
  );
}
