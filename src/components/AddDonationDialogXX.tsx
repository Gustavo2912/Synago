// src/components/AddDonationDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateDonation } from "@/hooks/useDonations";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ---------------- TYPES ---------------- */
type CampaignRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type OrgSettings = {
  organization_id: string;
  default_currency: string;
};

type Props = {
  donor: any;
  open: boolean;
  onClose: () => void;
};

/* =======================================================
   ADD DONATION DIALOG  (multi-currency, per-org)
======================================================= */
export default function AddDonationDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage(); // לא לוקחים מכאן currency
  const { organizationId } = useUser();
  const createDonation = useCreateDonation();

  /* ---------------- FORM STATE ---------------- */
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Regular");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("Succeeded");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string | "">("");

  /* ---------------- RESET ON OPEN ---------------- */
  useEffect(() => {
    if (open) {
      setAmount("");
      setType("Regular");
      setPaymentMethod("Cash");
      setDesignation("");
      setStatus("Succeeded");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setCampaignId("");
    }
  }, [open]);

  /* =======================================================
     LOAD CAMPAIGNS FOR CURRENT ORG
     (כשorganizationId = "all" – לא יחזיר כלום, וזה בסדר)
  ======================================================= */
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-for-org", organizationId],
    enabled: !!organizationId && organizationId !== "all",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, organization_id")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return data as CampaignRow[];
    },
  });

  /* =======================================================
     LOAD ORG SETTINGS (ALL ORGS) → CURRENCY PER ORG
  ======================================================= */
  const { data: orgSettings = [] } = useQuery({
    queryKey: ["org-settings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");

      if (error) throw error;
      return data as OrgSettings[];
    },
  });

  /* ---------------- MAP ORG → CURRENCY ---------------- */
  const orgCurrencyMap = useMemo(() => {
    const map = new Map<string, string>();
    orgSettings.forEach((s) => {
      map.set(s.organization_id, s.default_currency || "USD");
    });
    return map;
  }, [orgSettings]);

  /* =======================================================
     EFFECTIVE CURRENCY (ACCORDING TO SELECTED CAMPAIGN / ORG)
  ======================================================= */
  const effectiveCurrency = useMemo(() => {
    // 1️⃣ אם יש קמפיין → לוקחים את מטבע הארגון של הקמפיין
    if (campaignId) {
      const c = campaigns.find((x) => x.id === campaignId);
      if (c?.organization_id && orgCurrencyMap.has(c.organization_id)) {
        return orgCurrencyMap.get(c.organization_id)!;
      }
    }

    // 2️⃣ אם אין קמפיין → מטבע הארגון הפעיל (אם הוא לא "all")
    if (organizationId && organizationId !== "all" && orgCurrencyMap.has(organizationId)) {
      return orgCurrencyMap.get(organizationId)!;
    }

    // 3️⃣ ברירת מחדל
    return "USD";
  }, [campaignId, campaigns, orgCurrencyMap, organizationId]);

  /* =======================================================
     SAVE DONATION
  ======================================================= */
  if (!donor) return null;

  const handleSave = async () => {
    const num = parseFloat(amount);

    if (!donor.id) {
      alert("Missing donor id");
      return;
    }

    if (!amount || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    // 📌 קובעים organization_id אמיתי:
    // קודם לפי הקמפיין, ואם אין – לפי organizationId, בתנאי שהוא לא "all"
    let resolvedOrgId: string | null = organizationId || null;

    if (campaignId) {
      const c = campaigns.find((x) => x.id === campaignId);
      if (c?.organization_id) {
        resolvedOrgId = c.organization_id;
      }
    }

    // אם עדיין אין ארגון תקין (או שזה "all") → לא שולחים UUID לא חוקי
    if (!resolvedOrgId || resolvedOrgId === "all") {
      alert(
        t("errors.organizationRequired") ||
          "Please select a specific organization before adding a donation."
      );
      return;
    }

    try {
      await createDonation.mutateAsync({
        donor_id: donor.id,
        organization_id: resolvedOrgId,
        campaign_id: campaignId || null,

        amount: num,
        currency: effectiveCurrency, // ✔ המטבע הנכון
        type,
        designation,
        payment_method: paymentMethod,
        date: new Date(date).toISOString(),
        status,
        notes,
      });

      onClose();
    } catch (err: any) {
      console.error("createDonation error", err);
      alert(err?.message || "Failed to create donation");
    }
  };

  /* =======================================================
     DONOR NAME
  ======================================================= */
  const fullName =
    donor.display_name ||
    `${donor.first_name || ""} ${donor.last_name || ""}`.trim() ||
    donor.email ||
    donor.phone ||
    "Donor";

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("donors.addDonation")} – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto p-1 text-sm">
          {/* AMOUNT + CURRENCY */}
          <div>
            <div>
              {t("donations.amount")}{" "}
              <span className="text-gray-500">({effectiveCurrency})</span>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* TYPE */}
          <div>
            <div>{t("donations.type")}</div>
            <select
              className="w-full border rounded-md h-9 px-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Regular">Regular</option>
              <option value="Nedarim">Nedarim</option>
              <option value="Aliyot">Aliyot</option>
              <option value="Yahrzeit">Yahrzeit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* PAYMENT METHOD */}
          <div>
            <div>{t("donations.paymentMethod")}</div>
            <select
              className="w-full border rounded-md h-9 px-2"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Transfer">Transfer</option>
              <option value="CreditCard">Credit Card</option>
              <option value="Zelle">Zelle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* DATE */}
          <div>
            <div>{t("common.date")}</div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* DESIGNATION */}
          <div>
            <div>Designation</div>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          {/* CAMPAIGN */}
          <div>
            <div>{t("donations.campaign")}</div>
            <select
              className="w-full border rounded-md h-9 px-2"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          </div>

          {/* NOTES */}
          <div>
            <div>{t("common.notes")}</div>
            <textarea
              className="w-full border rounded-md text-sm px-2 py-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* BUTTONS */}
          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
