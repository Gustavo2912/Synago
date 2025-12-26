// src/components/AddPaymentDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreatePayment } from "@/hooks/usePayments";
import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  pledgeId: string | null;
  donorId: string | null;
  /** יכול להגיע עם org של ה־pledge (לברירת מחדל), אבל ההחלטה הסופית תמיד לפי ה־UserContext */
  organizationId: string | null;
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
  const { isGlobalSuperAdmin, organizationId: ctxOrgId } = useUser();
  const createPayment = useCreatePayment();

  const isAllMode = isGlobalSuperAdmin && ctxOrgId === "all";

  /* -------------------------------------------
     Local State
  ------------------------------------------- */
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  /* -------------------------------------------
     Reset dialog state whenever it opens
  ------------------------------------------- */
  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod("Cash");
      setReferenceNumber("");
      setNotes("");

      // ברירת מחדל לארגון לפי מצב:
      // - במצב ALL → ננסה לקחת מה־prop (הארגון של ה־pledge), אחרת null עד שהמשתמש יבחר
      // - במצב רגיל → לוקחים את ה־organizationId מה־UserContext, ואם חסר אז מה־prop
      if (isAllMode) {
        setSelectedOrg(organizationId || null);
      } else {
        setSelectedOrg(ctxOrgId || organizationId || null);
      }
    }
  }, [open, isAllMode, ctxOrgId, organizationId]);

  /* -------------------------------------------
     Load organizations (רק למצב ALL)
  ------------------------------------------- */
  const { data: organizations = [] } = useQuery({
    queryKey: ["payment-orgs"],
    enabled: isAllMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  /* -------------------------------------------
     Load org settings → currency per org
  ------------------------------------------- */
  const { data: settings = [] } = useQuery({
    queryKey: ["payment-org-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");

      if (error) throw error;
      return data || [];
    },
  });

  const currencyMap = useMemo(() => {
    const m = new Map<string, string>();
    settings.forEach((s: any) => {
      m.set(s.organization_id, s.default_currency || "ILS");
    });
    return m;
  }, [settings]);

  // org בפועל שאיתו שומרים למסד הנתונים
  const resolvedOrgId: string | null = useMemo(() => {
    if (isAllMode) {
      // במצב ALL – חובה selectedOrg
      return selectedOrg || null;
    }
    // במצב רגיל – לפי context, ואם חסר אז fallback לפרופס
    return ctxOrgId || organizationId || null;
  }, [isAllMode, selectedOrg, ctxOrgId, organizationId]);

  const effectiveCurrency = useMemo(() => {
    if (!resolvedOrgId) return "ILS";
    return currencyMap.get(resolvedOrgId) || "ILS";
  }, [resolvedOrgId, currencyMap]);

  /* -------------------------------------------
     Missing IDs → safe loading dialog
  ------------------------------------------- */
  if (!donorId || !pledgeId) {
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

  /* -------------------------------------------
     SAVE PAYMENT
  ------------------------------------------- */
  const savePayment = async () => {
    if (!resolvedOrgId) {
      alert(t("errors.organizationRequired") || "Organization is required");
      return;
    }

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    try {
      await createPayment.mutateAsync({
        pledge_id: pledgeId,
        donor_id: donorId,
        organization_id: resolvedOrgId,
        amount: amt,
        currency: effectiveCurrency,
        date,
        method,
        reference_number: referenceNumber || null,
        notes: notes || null,
        status: "succeeded",
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save payment\n" + (err.message || ""));
    }
  };

  /* -------------------------------------------
     RENDER
  ------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.addPayment") || "Add Payment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ============= ORG SELECT (Super Admin / ALL) ============= */}
          {isAllMode && (
            <div>
              <div>{t("common.organization") || "Organization"}</div>
              <select
                className="w-full border rounded-md px-2 h-9 bg-background"
                value={selectedOrg || ""}
                onChange={(e) => setSelectedOrg(e.target.value || null)}
              >
                <option value="">
                  {t("common.selectOrganization") || "Select organization"}
                </option>
                {organizations.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ============= AMOUNT + CURRENCY ============= */}
          <div>
            <div>
              {t("payments.amount") || "Amount"}{" "}
              <span className="text-muted-foreground">
                ({effectiveCurrency})
              </span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* ============= DATE ============= */}
          <div>
            <div>{t("common.date") || "Date"}</div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* ============= METHOD ============= */}
          <div>
            <div>{t("payments.method") || "Method"}</div>
            <Input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>

          {/* ============= REFERENCE # ============= */}
          <div>
            <div>{t("payments.reference") || "Reference Number"}</div>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* ============= NOTES ============= */}
          <div>
            <div>{t("common.notes") || "Notes"}</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ============= ACTIONS ============= */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel") || "Cancel"}
            </Button>

            <Button onClick={savePayment} disabled={createPayment.isPending}>
              {createPayment.isPending
                ? t("common.saving") || "Saving..."
                : t("common.save") || "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
