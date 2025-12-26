// src/components/AddPaymentDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreatePayment } from "@/hooks/usePayments";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useOrganizations } from "@/hooks/useOrganizations";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OrgSettings = {
  organization_id: string;
  default_currency: string | null;
};

type Props = {
  pledgeId: string | null;
  donorId: string | null;
  organizationId: string | null; // יכול להגיע מה-pledge או להיות null
  open: boolean;
  onClose: () => void;
};

export default function AddPaymentDialog({
  pledgeId,
  donorId,
  organizationId,
  open,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const { organizationId: ctxOrgId, isGlobalSuperAdmin } = useUser();
  const { organizations } = useOrganizations();

  const createPayment = useCreatePayment();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  /* ---------------- RESET ON OPEN ---------------- */
  useEffect(() => {
    if (!open) return;

    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setMethod("Cash");
    setReferenceNumber("");
    setNotes("");

    if (organizationId) {
      // אם הגיע ארגון מה-pledge – נשתמש בו
      setSelectedOrgId(organizationId);
    } else if (!isGlobalSuperAdmin || ctxOrgId !== "all") {
      setSelectedOrgId(ctxOrgId || "");
    } else if (organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    } else {
      setSelectedOrgId("");
    }
  }, [open, organizationId, ctxOrgId, isGlobalSuperAdmin, organizations]);

  /* ---------------- ORG SETTINGS (CURRENCY) ---------------- */
  const { data: orgSettings = [] } = useQuery({
    queryKey: ["org-settings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");

      if (error) throw error;
      return (data || []) as OrgSettings[];
    },
  });

  const orgCurrencyMap = useMemo(() => {
    const map = new Map<string, string>();
    orgSettings.forEach((s) => {
      if (s.organization_id) {
        map.set(s.organization_id, s.default_currency || "ILS");
      }
    });
    return map;
  }, [orgSettings]);

  const currency = useMemo(() => {
    if (selectedOrgId && orgCurrencyMap.has(selectedOrgId)) {
      return orgCurrencyMap.get(selectedOrgId)!;
    }
    return "ILS";
  }, [selectedOrgId, orgCurrencyMap]);

  /* ---------------- BASIC VALIDATION VIEW ---------------- */
  if (!donorId) {
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

  /* ---------------- SAVE PAYMENT ---------------- */
  const savePayment = async () => {
    const num = Number(amount);

    if (!selectedOrgId) {
      alert(t("errors.organizationRequired") || "Please select organization");
      return;
    }

    if (!num || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    try {
      await createPayment.mutateAsync({
        pledge_id: pledgeId,
        donor_id: donorId,
        organization_id: selectedOrgId,
        amount: num,
        date,
        method,
        reference_number: referenceNumber || null,
        notes: notes || null,
        status: "succeeded",
        currency,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save payment\n" + (err.message || ""));
    }
  };

  const loading = createPayment.isPending;

  /* ---------------- RENDER ---------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.addPayment") || "Add Payment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ORG SELECT
              אם organizationId הגיע מה-pledge – נציג אותו קריא בלבד
              אחרת, במיוחד ב-ALL, נאפשר בחירה */}
          {organizationId ? (
            <div>
              <div>{t("common.organization") || "Organization"}</div>
              <select
                className="w-full border rounded-md h-9 px-2 bg-muted"
                value={selectedOrgId}
                disabled
              >
                <option value={organizationId}>
                  {organizations.find((o: any) => o.id === organizationId)?.name ||
                    organizationId}
                </option>
              </select>
            </div>
          ) : (
            isGlobalSuperAdmin &&
            ctxOrgId === "all" && (
              <div>
                <div>{t("common.organization") || "Organization"}</div>
                <select
                  className="w-full border rounded-md h-9 px-2 bg-background"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                >
                  <option value="">
                    {t("common.selectOrganization") || "Select organization"}
                  </option>
                  {organizations.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name || o.id}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          <Input
            type="number"
            placeholder={
              (t("payments.amount") as string | undefined) ||
              `Amount (${currency})`
            }
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            placeholder={t("payments.method") || "Method"}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />

          <Input
            placeholder={t("payments.referenceNumber") || "Reference Number"}
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />

          <Textarea
            placeholder={t("payments.notes") || "Notes"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel") || "Cancel"}
            </Button>

            <Button onClick={savePayment} disabled={loading}>
              {loading ? t("common.saving") || "Saving..." : t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
