// src/pages/DonorProfile.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useDonorDonations } from "@/hooks/useDonations";
import { usePledgesByDonor } from "@/hooks/usePledges";
import { usePaymentsForPledges } from "@/hooks/usePaymentsForPledges";

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

type DonorProfileProps = {
  donor: any | null;
  open: boolean;
  onClose: () => void;
};

export default function DonorProfile({ donor, open, onClose }: DonorProfileProps) {
  const { t, currency } = useLanguage();
  const { organizationId } = useUser();

  const donorId = donor?.id ?? null;

  /* ------------------- LOAD DATA VIA HOOKS ------------------- */

  const donationsQuery = useDonorDonations(donorId || undefined);
  const pledgesQuery = usePledgesByDonor(donorId || undefined);

  const donations = donationsQuery.data || [];
  const pledges = pledgesQuery.data || [];

  // מזהים את כל ה-pledge_ids של התורם
  const pledgeIds = useMemo(
    () => pledges.map((p: any) => p.id).filter(Boolean),
    [pledges]
  );

  // תשלומים לפי pledge_id (שינוי חשוב – לא לפי donor_id)
  const paymentsQuery = usePaymentsForPledges(pledgeIds);
  const paymentsByPledgeId = paymentsQuery.data?.paymentsByPledgeId || {};

  /* ------------------- ORGANIZATION NAMES ------------------- */

  const { data: orgs = [] } = useQuery({
    queryKey: ["donor-profile-orgs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const orgNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    orgs.forEach((o: any) => {
      if (o.id) map[o.id] = o.name || o.id;
    });
    return map;
  }, [orgs]);

  /* ------------------- LOCAL STATE ------------------- */

  const [addDonationOpen, setAddDonationOpen] = useState(false);
  const [addPledgeOpen, setAddPledgeOpen] = useState(false);
  const [addPaymentForPledge, setAddPaymentForPledge] = useState<{
    pledgeId: string;
    donorId: string;
    organizationId: string | null;
  } | null>(null);

  // per-organization sort state for donation tables
  const [orgSort, setOrgSort] = useState<
    Record<string, { field: string; dir: "asc" | "desc" }>
  >({});

  const toggleSort = (orgId: string, field: string) => {
    setOrgSort((prev) => {
      const current = prev[orgId] || { field: "", dir: "asc" };
      if (current.field === field) {
        return {
          ...prev,
          [orgId]: {
            field,
            dir: current.dir === "asc" ? "desc" : "asc",
          },
        };
      }
      return {
        ...prev,
        [orgId]: { field, dir: "asc" },
      };
    });
  };

  /* ------------------- HELPERS ------------------- */

  const formatAmount = (v: number | string | null | undefined) => {
    const n = Number(v || 0);
    return `${currency} ${n.toLocaleString()}`;
  };

  const formatDate = (v: string | null | undefined) => {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
  };

  /* GROUP DONATIONS BY ORG */

  const groupedDonationsByOrg = useMemo(() => {
    const map = new Map<string, any[]>();
    donations.forEach((d: any) => {
      const key = d.organization_id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [donations]);

  const fullName =
    donor?.display_name ||
    `${donor?.first_name || ""} ${donor?.last_name || ""}`.trim() ||
    donor?.email ||
    donor?.phone ||
    "Donor";

  /* --------------------------- EARLY EXIT --------------------------- */

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

  /* --------------------------- RENDER --------------------------- */

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

            {/* ===================== SUMMARY CARDS ===================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Donor Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("donorProfile.details")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div>
                    <strong>Name:</strong> {fullName}
                  </div>
                  {donor.email && (
                    <div>
                      <strong>Email:</strong> {donor.email}
                    </div>
                  )}
                  {donor.phone && (
                    <div>
                      <strong>Phone:</strong> {donor.phone}
                    </div>
                  )}
                  {donor.notes && (
                    <div>
                      <strong>Notes:</strong>
                      <div className="text-xs text-muted-foreground">
                        {donor.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Donations Summary */}
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>{t("donorProfile.donationsSummary")}</CardTitle>
                  <Button size="sm" onClick={() => setAddDonationOpen(true)}>
                    <PlusCircle className="w-4 h-4" />
                    {t("donorProfile.addDonation")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>{t("donorProfile.total")}:</span>
                    <span>
                      {formatAmount(
                        donations.reduce(
                          (sum: number, d: any) => sum + Number(d.amount || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="text-xs flex justify-between mt-1">
                    <span>{t("donorProfile.donationsCount")}:</span>
                    <span>{donations.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pledges Summary */}
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>{t("donorProfile.pledgesSummary")}</CardTitle>
                  <Button size="sm" onClick={() => setAddPledgeOpen(true)}>
                    <PlusCircle className="w-4 h-4" />
                    {t("donorProfile.addPledge") ?? "Add Pledge"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>{t("donorProfile.total")}</span>
                    <span>
                      {formatAmount(
                        pledges.reduce(
                          (sum: number, p: any) =>
                            sum + Number(p.total_amount || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="text-xs flex justify-between mt-1">
                    <span>{t("donorProfile.pledgesCount") ?? "Pledges"}:</span>
                    <span>{pledges.length}</span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ===================== DONATIONS BY ORG ===================== */}

            <Card>
              <CardHeader>
                <CardTitle className="flex gap-2 items-center text-sm font-medium">
                  <Building2 className="w-4 h-4" />
                  {t("donorProfile.byOrganization")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {donations.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t("donorProfile.noDonations")}
                  </div>
                ) : (
                  Array.from(groupedDonationsByOrg.entries()).map(
                    ([orgId, orgDonations]) => {
                      const orgDonationsTyped = orgDonations as any[];

                      const label =
                        orgId === "unknown"
                          ? t("donorProfile.noOrg") || "No Organization"
                          : orgNameMap[orgId] ||
                            orgDonationsTyped[0]?.organization_name ||
                            orgId;

                      const sortState = orgSort[orgId] || {
                        field: "",
                        dir: "asc" as const,
                      };

                      const sorted = [...orgDonationsTyped].sort((a, b) => {
                        if (!sortState.field) return 0;
                        let A = a[sortState.field];
                        let B = b[sortState.field];

                        if (sortState.field === "amount") {
                          A = Number(A || 0);
                          B = Number(B || 0);
                        } else if (sortState.field === "date") {
                          A = new Date(A || "").getTime();
                          B = new Date(B || "").getTime();
                        } else {
                          A = String(A || "").toLowerCase();
                          B = String(B || "").toLowerCase();
                        }

                        if (A < B) return sortState.dir === "asc" ? -1 : 1;
                        if (A > B) return sortState.dir === "asc" ? 1 : -1;
                        return 0;
                      });

                      const orgTotal = orgDonationsTyped.reduce(
                        (sum: number, d: any) => sum + Number(d.amount || 0),
                        0
                      );

                      return (
                        <div key={orgId} className="border rounded-lg p-3 space-y-2">
                          {/* ORG HEADER */}
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">
                              <Building2 className="w-3 h-3 mr-1" />
                              {label}
                            </Badge>

                            <span className="font-semibold">
                              {formatAmount(orgTotal)}
                            </span>
                          </div>

                          {/* TABLE */}
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {[
                                    ["amount", "Amount"],
                                    ["date", "Date"],
                                    ["payment_method", "Method"],
                                    ["campaign_name", "Campaign"],
                                    ["notes", "Notes"],
                                  ].map(([field, label]) => (
                                    <TableHead
                                      key={field}
                                      className="cursor-pointer hover:bg-gray-100 text-xs"
                                      onClick={() =>
                                        toggleSort(orgId as string, field as string)
                                      }
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
                                {sorted.map((d: any) => (
                                  <TableRow key={d.id}>
                                    <TableCell className="text-sm">
                                      {formatAmount(d.amount)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      <Calendar className="w-3 h-3 inline mr-1" />
                                      {formatDate(d.date)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      <CreditCard className="inline w-3 h-3 mr-1" />
                                      {d.payment_method || "-"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {d.campaign_name || "-"}
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate text-sm">
                                      {d.notes || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </CardContent>
            </Card>

            {/* ===================== PLEDGES & PAYMENTS ===================== */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Gift className="w-4 h-4" />
                  {t("donorProfile.pledgesPayments")}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {pledges.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t("donorProfile.noPledges")}
                  </div>
                ) : (
                  pledges.map((p: any) => {
                    const pays = paymentsByPledgeId[p.id] || [];
                    const paid = pays.reduce(
                      (sum: number, x: any) => sum + Number(x.amount || 0),
                      0
                    );
                    const balance = Number(p.total_amount || 0) - paid;

                    const orgLabel =
                      (p.organization_id &&
                        (orgNameMap[p.organization_id] ||
                          p.organization_name)) ||
                      "";

                    return (
                      <PledgeRow
                        key={p.id}
                        pledge={p}
                        payments={pays}
                        paid={paid}
                        balance={balance}
                        orgName={orgLabel}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        onAddPayment={() =>
                          setAddPaymentForPledge({
                            pledgeId: p.id,
                            donorId,
                            organizationId: p.organization_id,
                          })
                        }
                      />
                    );
                  })
                )}
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
