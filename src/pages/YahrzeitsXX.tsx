// src/pages/Yahrzeits.tsx

import React, { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import {
  useYahrzeits,
  useYahrzeitDonations,
  useDeleteYahrzeit,
} from "@/hooks/useYahrzeits";

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

/* ---------------- Helpers ---------------- */

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d ?? "" : dt.toLocaleDateString("en-GB");
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

function highlight(text: string | null | undefined, query: string) {
  if (!text) return "";
  if (!query.trim()) return text;
  const safe = String(text);
  return safe.replace(new RegExp(`(${query})`, "gi"), "<mark>$1</mark>");
}

/* ------------------------------------------- */

export default function YahrzeitsPage() {
  const { t } = useLanguage();
  const { isGlobalSuperAdmin, organizationId } = useUser();

  const { data: yahrzeits = [] } = useYahrzeits();
  const { data: yahrzeitDonations = [] } = useYahrzeitDonations();
  const deleteMutation = useDeleteYahrzeit();

  const [search, setSearch] = useState("");
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [selectedForEdit, setSelectedForEdit] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // האם להציג עמודת ארגון – רק ל־super_admin ב-ALL
  const showOrgColumn = isGlobalSuperAdmin && organizationId === "all";

  /* ---------------- METRICS ---------------- */

  const totalYahrzeits = yahrzeits.length;

  const upcomingThisMonth = useMemo(() => {
    const currentMonth = today.getMonth();
    return yahrzeits.filter((y: any) => {
      const next = getNextOccurrence(y.secular_date);
      return next && next.getMonth() === currentMonth;
    }).length;
  }, [yahrzeits, today]);

  const withReminders = yahrzeits.filter((y: any) => y.reminder_enabled).length;

  /* --------- NEW LOGIC: SUM PER YAHRZEIT ---------- */

  const donationByYahrzeit = useMemo(() => {
    const map = new Map<
      string,
      {
        amount: number;
        date: string | null;
        currency: string | null;
      }
    >();

    yahrzeitDonations.forEach((d) => {
      if (!d.yahrzeit_id) return;

      const existing = map.get(d.yahrzeit_id);

      if (!existing) {
        map.set(d.yahrzeit_id, {
          amount: Number(d.amount || 0),
          date: d.date,
          currency: d.currency || "USD",
        });
      } else {
        // בוחרים את התרומה האחרונה לפי תאריך
        const prev = existing.date ? new Date(existing.date) : null;
        const cur = d.date ? new Date(d.date) : null;

        if (!prev || (cur && cur > prev)) {
          map.set(d.yahrzeit_id, {
            amount: Number(d.amount || 0),
            date: d.date,
            currency: d.currency || existing.currency,
          });
        }
      }
    });

    return map;
  }, [yahrzeitDonations]);

  const totalDonationAmount = Array.from(donationByYahrzeit.values()).reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );

  const totalDonationCount = donationByYahrzeit.size;

  /* ---------------- FILTERED LIST ---------------- */

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
  }, [yahrzeits, search, showUpcomingOnly, todayMidnight]);

  /* ---------------- GROUP BY MONTH ---------------- */

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();

    filtered.forEach((y: any) => {
      const d = y.secular_date ? new Date(y.secular_date) : null;
      const key =
        d && !isNaN(d.getTime())
          ? d.toLocaleString("en-GB", { month: "long" })
          : t("yahrzeits.unknownMonth") || "Unknown";

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(y);
    });

    return Array.from(map.entries());
  }, [filtered, t]);

  /* ---------------- SORTING ---------------- */

  const [sortField, setSortField] = useState<string>("secular_date");
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

      const sA = (A || "").toString().toLowerCase();
      const sB = (B || "").toString().toLowerCase();
      if (sA < sB) return sortDir === "asc" ? -1 : 1;
      if (sA > sB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* TITLE + ADD BUTTON */}
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

        <Button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2"
        >
          <CalendarPlus className="w-4 h-4" />
          {t("yahrzeits.addButton") || "Add Yahrzeit"}
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Yahrzeits */}
        <Card className="bg-white/80 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              {t("yahrzeits.totalYahrzeits")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalYahrzeits}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming this month */}
        <Card className="bg-white/80 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
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

        {/* With reminders */}
        <Card className="bg-white/80 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4 text-amber-600" />
              {t("yahrzeits.withReminders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">
              {withReminders}
            </div>
          </CardContent>
        </Card>

        {/* Total Donations (Yahrzeit) */}
        <Card className="bg-white/80 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-rose-600" />
              {t("yahrzeits.yahrzeitDonations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-700">
              {totalDonationAmount.toLocaleString()} ₪
            </div>
            <div className="text-xs text-muted-foreground">
              {totalDonationCount} {t("yahrzeits.donationsCount")}
            </div>
          </CardContent>
        </Card>

        {/* Donors count */}
        <Card className="bg-white/80 shadow-sm border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCircle2 className="w-4 h-4 text-indigo-600" />
              {t("yahrzeits.totalDonors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">
              {new Set(yahrzeits.map((y) => y.donor_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-white/80 shadow-sm border">
        <CardContent className="flex flex-col md:flex-row gap-4 py-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("yahrzeits.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs md:text-sm">
            <Switch
              checked={showUpcomingOnly}
              onCheckedChange={(checked) => setShowUpcomingOnly(Boolean(checked))}
            />
            <span className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              {t("yahrzeits.next30DaysToggle")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* TABLE SECTION */}
      <div className="space-y-4">
        {grouped.length === 0 && (
          <Card className="bg-white/80 border shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t("yahrzeits.noResults")}
            </CardContent>
          </Card>
        )}

        {grouped.map(([groupLabel, items]) => {
          const sortedRows = sortRows(items);

          return (
            <Card key={groupLabel} className="bg-white/80 border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LayoutDashboard className="w-4 h-4 text-purple-600" />
                  {groupLabel}
                  <Badge variant="outline" className="ml-2">
                    {sortedRows.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        {/* Donor */}
                        <TableHead
                          onClick={() => toggleSort("donor_name")}
                          className="px-3 py-2 text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-1">
                            {t("yahrzeits.donor")}
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          </div>
                        </TableHead>

                        {showOrgColumn && (
                          <TableHead
                            onClick={() => toggleSort("organization_name")}
                            className="px-3 py-2 text-xs cursor-pointer"
                          >
                            {t("yahrzeits.organization")}
                          </TableHead>
                        )}

                        {/* Contact */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("yahrzeits.contact")}
                        </TableHead>

                        {/* Deceased */}
                        <TableHead
                          onClick={() => toggleSort("deceased_name")}
                          className="px-3 py-2 text-xs cursor-pointer"
                        >
                          {t("yahrzeits.deceasedName")}
                        </TableHead>

                        {/* Relationship */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("yahrzeits.relationship")}
                        </TableHead>

                        {/* Date */}
                        <TableHead
                          onClick={() => toggleSort("secular_date")}
                          className="px-3 py-2 text-xs cursor-pointer"
                        >
                          {t("yahrzeits.secularDate")}
                        </TableHead>

                        {/* Prayer */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("yahrzeits.prayerText")}
                        </TableHead>

                        {/* Donations */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("yahrzeits.donationsColumn")}
                        </TableHead>

                        {/* Reminder */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("yahrzeits.reminderColumn")}
                        </TableHead>

                        {/* Actions */}
                        <TableHead className="px-3 py-2 text-xs">
                          {t("common.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {sortedRows.map((y: any) => {
                        const donation = donationByYahrzeit.get(y.id);

                        const donorIsContact =
                          (y.contact_name || "").trim().toLowerCase() ===
                          (y.donor_name || "").trim().toLowerCase();

                        return (
                          <TableRow key={y.id} className="hover:bg-gray-50">
                            {/* Donor */}
                            <TableCell className="px-3 py-2">
                              <div
                                className="font-medium"
                                dangerouslySetInnerHTML={{
                                  __html: highlight(y.donor_name, search),
                                }}
                              />
                              <div className="text-xs text-muted-foreground">
                                {y.donor_email}
                                {y.donor_phone && <div>{y.donor_phone}</div>}
                              </div>
                            </TableCell>

                            {showOrgColumn && (
                              <TableCell className="px-3 py-2 text-xs">
                                {y.organization_name || "-"}
                              </TableCell>
                            )}

                            {/* Contact */}
                            <TableCell className="px-3 py-2 text-xs">
                              {donorIsContact ? (
                                <span className="text-blue-700 font-medium">
                                  {t("yahrzeits.contactSameAsDonor")}
                                </span>
                              ) : (
                                <>
                                  {y.contact_name}
                                  {y.contact_email && (
                                    <div className="text-muted-foreground">
                                      {y.contact_email}
                                    </div>
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

                            {/* Deceased */}
                            <TableCell
                              className="px-3 py-2"
                              dangerouslySetInnerHTML={{
                                __html: highlight(y.deceased_name, search),
                              }}
                            />

                            {/* Relationship */}
                            <TableCell className="px-3 py-2">
                              {y.relationship || "-"}
                            </TableCell>

                            {/* Date */}
                            <TableCell className="px-3 py-2">
                              {fmtDate(y.secular_date)}
                            </TableCell>

                            {/* Prayer Text */}
                            <TableCell className="px-3 py-2 text-xs whitespace-pre-wrap">
                              {y.prayer_text || "-"}
                            </TableCell>

                            {/* Donations */}
                            <TableCell className="px-3 py-2 text-xs">
                              <div className="font-semibold">
                                {(donation?.amount || 0).toLocaleString()}{" "}
                                {donation?.currency || "USD"}
                              </div>
                              {donation?.date && (
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  {t("yahrzeits.lastDonation")}:{" "}
                                  {fmtDate(donation.date)}
                                </div>
                              )}
                            </TableCell>

                            {/* Reminder */}
                            <TableCell className="px-3 py-2">
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

                            {/* Actions */}
                            <TableCell className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
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
