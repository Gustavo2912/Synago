// =============================
//  DonorProfile.tsx — Multicurrency Version
// =============================
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useDonorDonations } from "@/hooks/useDonations";
import { usePledgesByDonor } from "@/hooks/usePledges";
import { usePaymentsForPledges } from "@/hooks/usePaymentsForPledges";
import { useOrganizations } from "@/hooks/useOrganizations";

import AddDonationDialog from "@/components/AddDonationDialog";
import AddPledgeDialog from "@/components/AddPledgeDialog";
import AddPaymentDialog from "@/components/AddPaymentDialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Building2,
  Calendar,
  CreditCard,
  Gift,
  PlusCircle,
  ArrowUpDown,
} from "lucide-react";

import PledgeRow from "./PledgeRow";

// =======================
// Helper
// =======================
const fmtDate = (v?: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
};

export default function DonorProfile({ donor, open, onClose }) {
  const { t } = useLanguage();
  const { organizationId } = useUser();

  const donorId = donor?.id ?? null;

  // ---------------------- LOAD DATA ----------------------
  const donationsQuery = useDonorDonations(donorId || undefined);
  const pledgesQuery = usePledgesByDonor(donorId || undefined);

  const donations = donationsQuery.data || [];
  const pledges = pledgesQuery.data || [];

  const pledgeIds = useMemo(
    () => pledges.map((p) => p.id).filter(Boolean),
    [pledges]
  );

  const paymentsQuery = usePaymentsForPledges(pledgeIds);
  const paymentsByPledgeId = paymentsQuery.data?.paymentsByPledgeId || {};

  // ---------------------- ORGS & SETTINGS ----------------------
  const { organizations } = useOrganizations();

  // load settings for all orgs (currency)
  const { data: settingsAllOrgs = [] } = useQuery({
    queryKey: ["all-org-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Map orgId -> currency
  const orgCurrencyMap = useMemo(() => {
    const map = new Map();
    settingsAllOrgs.forEach((s) => {
      map.set(s.organization_id, s.default_currency || "USD");
    });
    return map;
  }, [settingsAllOrgs]);

  // Map orgId -> orgName
  const orgNameMap = useMemo(() => {
    const map = new Map();
    organizations.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [organizations]);

  // ---------------------- LOCAL STATE ----------------------
  const [addDonationOpen, setAddDonationOpen] = useState(false);
  const [addPledgeOpen, setAddPledgeOpen] = useState(false);
  const [addPaymentForPledge, setAddPaymentForPledge] = useState(null);

  const [orgSort, setOrgSort] = useState({});

  const toggleSort = (orgId, field) => {
    setOrgSort((prev) => {
      const cur = prev[orgId] || { field: "", dir: "asc" };
      if (cur.field === field) {
        return {
          ...prev,
          [orgId]: { field, dir: cur.dir === "asc" ? "desc" : "asc" },
        };
      }
      return {
        ...prev,
        [orgId]: { field, dir: "asc" },
      };
    });
  };

  // ---------------------- GROUP PER ORG ----------------------
  const donationsByOrg = useMemo(() => {
    const map = new Map();
    donations.forEach((d) => {
      const key = d.organization_id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return map;
  }, [donations]);

  const pledgesByOrg = useMemo(() => {
    const map = new Map();
    pledges.forEach((p) => {
      const key = p.organization_id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return map;
  }, [pledges]);

  // ---------------------- SUMMARY PER CURRENCY ----------------------
  const donationTotalsPerCurrency = useMemo(() => {
    const sums = new Map();
    donations.forEach((d) => {
      const cur = orgCurrencyMap.get(d.organization_id) || "USD";
      const amt = Number(d.amount || 0);
      sums.set(cur, (sums.get(cur) || 0) + amt);
    });
    return Array.from(sums.entries());
  }, [donations, orgCurrencyMap]);

  const pledgeTotalsPerCurrency = useMemo(() => {
    const map = new Map();

    pledges.forEach((p) => {
      const cur = orgCurrencyMap.get(p.organization_id) || "USD";

      const total = Number(p.total_amount || 0);
      const payments = paymentsByPledgeId[p.id] || [];
      const paid = payments.reduce((s, x) => s + Number(x.amount), 0);
      const balance = total - paid;

      const prev = map.get(cur) || { total: 0, paid: 0, balance: 0 };
      map.set(cur, {
        total: prev.total + total,
        paid: prev.paid + paid,
        balance: prev.balance + balance,
      });
    });

    return Array.from(map.entries());
  }, [pledges, paymentsByPledgeId, orgCurrencyMap]);

  // ---------------------- FULL NAME ----------------------
  const fullName =
    donor?.display_name ||
    `${donor?.first_name || ""} ${donor?.last_name || ""}`.trim() ||
    donor?.email ||
    donor?.phone ||
    "Donor";

  // ---------------------- RENDER ----------------------
  if (!donor) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.loading")}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">

          {/* HEADER */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {fullName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2 text-sm">

            {/* =======================================
                SUMMARY CARDS — MULTI-CURRENCY
            ======================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <Card>
                <CardHeader>
                  <CardTitle>{t("donorProfile.details")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div><strong>Name:</strong> {fullName}</div>
                  {donor.email && <div><strong>Email:</strong> {donor.email}</div>}
                  {donor.phone && <div><strong>Phone:</strong> {donor.phone}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>{t("donorProfile.donationsSummary")}</CardTitle>
                  <Button size="sm" onClick={() => setAddDonationOpen(true)}>
                    <PlusCircle className="w-4 h-4" />
                    {t("donorProfile.addDonation")}
                  </Button>
                </CardHeader>
                <CardContent>
                  {donationTotalsPerCurrency.map(([cur, sum]) => (
                    <div key={cur} className="flex justify-between">
                      <span>{cur}:</span>
                      <span>{sum.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="text-xs mt-2">
                    {t("donorProfile.donationsCount")}: {donations.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>{t("donorProfile.pledgesSummary")}</CardTitle>
                  <Button size="sm" onClick={() => setAddPledgeOpen(true)}>
                    <PlusCircle className="w-4 h-4" />
                    {t("donorProfile.addPledge")}
                  </Button>
                </CardHeader>
                <CardContent>
                  {pledgeTotalsPerCurrency.map(([cur, data]) => (
                    <div key={cur} className="mb-2">
                      <div className="flex justify-between">
                        <span>{cur}</span>
                        <span>{data.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs pl-2">
                        <span>{t("payments.paid")}</span>
                        <span>{data.paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs pl-2 text-red-600">
                        <span>{t("payments.pledgeBalance")}</span>
                        <span>{data.balance.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* =======================================
                DONATIONS BY ORG
            ======================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center text-sm font-medium">
                  <Building2 className="w-4 h-4" />
                  {t("donorProfile.byOrganization")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {Array.from(donationsByOrg.entries()).map(([orgId, list]) => {
                  const cur = orgCurrencyMap.get(orgId) || "USD";
                  const orgLabel =
                    orgNameMap.get(orgId) ||
                    list[0]?.organization_name ||
                    "Unknown";

                  const total = list.reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );

                  const sort = orgSort[orgId] || { field: "", dir: "asc" };

                  const sorted = [...list].sort((a, b) => {
                    if (!sort.field) return 0;

                    let A = a[sort.field];
                    let B = b[sort.field];

                    if (sort.field === "amount") {
                      A = Number(A || 0);
                      B = Number(B || 0);
                    } else if (sort.field === "date") {
                      A = new Date(A).getTime();
                      B = new Date(B).getTime();
                    } else {
                      A = String(A || "").toLowerCase();
                      B = String(B || "").toLowerCase();
                    }

                    if (A < B) return sort.dir === "asc" ? -1 : 1;
                    if (A > B) return sort.dir === "asc" ? 1 : -1;
                    return 0;
                  });

                  return (
                    <div key={orgId} className="border rounded-lg p-3 space-y-2">

                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{orgLabel}</Badge>
                        <span className="font-semibold">
                          {cur} {total.toLocaleString()}
                        </span>
                      </div>

                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {[
                                ["amount", t("donations.amount")],
                                ["date", t("donations.date")],
                                ["payment_method", t("donations.paymentMethod")],
                                ["campaign_name", t("donations.campaign")],
                                ["notes", t("donations.notes")],
                              ].map(([field, label]) => (
                                <TableHead
                                  key={field}
                                  className="cursor-pointer text-xs"
                                  onClick={() => toggleSort(orgId, field)}
                                >
                                  <div className="flex items-center gap-1">
                                    {label}
                                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {sorted.map((d) => (
                              <TableRow key={d.id}>
                                <TableCell>{cur} {Number(d.amount).toLocaleString()}</TableCell>
                                <TableCell>{fmtDate(d.date)}</TableCell>
                                <TableCell>{d.payment_method || "-"}</TableCell>
                                <TableCell>{d.campaign_name || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {d.notes || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* =======================================
                PLEDGES & PAYMENTS
            ======================================= */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Gift className="w-4 h-4" />
                  {t("donorProfile.pledgesPayments")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {pledges.map((p) => {
                  const pays = paymentsByPledgeId[p.id] || [];
                  const paid = pays.reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );
                  const balance = Number(p.total_amount || 0) - paid;

                  const cur = orgCurrencyMap.get(p.organization_id) || "USD";
                  const orgLabel =
                    orgNameMap.get(p.organization_id) || p.organization_name;

                  return (
                    <PledgeRow
                      key={p.id}
                      pledge={p}
                      payments={pays}
                      paid={paid}
                      balance={balance}
                      orgName={orgLabel}
                      currency={cur}
                      formatDate={fmtDate}
                      onAddPayment={() =>
                        setAddPaymentForPledge({
                          pledgeId: p.id,
                          donorId,
                          organizationId: p.organization_id,
                        })
                      }
                    />
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALS */}
      <AddDonationDialog
        donor={donor}
        open={addDonationOpen}
        onClose={() => setAddDonationOpen(false)}
      />

      <AddPledgeDialog
        donor={donor}
        open={addPledgeOpen}
        onClose={() => setAddPledgeOpen(false)}
      />

      {addPaymentForPledge && (
        <AddPaymentDialog
          pledgeId={addPaymentForPledge.pledgeId}
          donorId={addPaymentForPledge.donorId}
          organizationId={addPaymentForPledge.organizationId}
          open
          onClose={() => setAddPaymentForPledge(null)}
        />
      )}
    </>
  );
}
