// src/components/AddDonationDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreateDonation } from "@/hooks/useDonations";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useOrganizations } from "@/hooks/useOrganizations";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CampaignRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type OrgSettings = {
  organization_id: string;
  default_currency: string | null;
};

type Props = {
  donor: any;
  open: boolean;
  onClose: () => void;
};

export default function AddDonationDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const { organizations } = useOrganizations();
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

  // הארגון שבו נשמור את התרומה בפועל
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  /* ---------------- RESET ON OPEN ---------------- */
  useEffect(() => {
    if (!open) return;

    setAmount("");
    setType("Regular");
    setPaymentMethod("Cash");
    setDesignation("");
    setStatus("Succeeded");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setCampaignId("");

    // ברירת מחדל לארגון
    if (!isGlobalSuperAdmin || organizationId !== "all") {
      // משתמש רגיל או סופר אדמין על ארגון ספציפי
      setSelectedOrgId(organizationId || "");
    } else {
      // super_admin על ALL – ננסה לקחת את הארגון הראשון ברשימה
      if (organizations.length > 0) {
        setSelectedOrgId(organizations[0].id);
      } else {
        setSelectedOrgId("");
      }
    }
  }, [open, organizationId, isGlobalSuperAdmin, organizations]);

  /* =======================================================
     LOAD CAMPAIGNS FOR SELECTED ORG
  ======================================================= */
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-for-org", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, organization_id")
        .eq("organization_id", selectedOrgId);

      if (error) throw error;
      return data as CampaignRow[];
    },
  });

  /* =======================================================
     LOAD ORG SETTINGS (CURRENCY PER ORG)
  ======================================================= */
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

  /* =======================================================
     EFFECTIVE CURRENCY (לפי קמפיין/ארגון)
  ======================================================= */
  const effectiveCurrency = useMemo(() => {
    // אם יש קמפיין – נשתמש בארגון של הקמפיין (ליתר בטחון)
    if (campaignId) {
      const camp = campaigns.find((c) => c.id === campaignId);
      if (camp?.organization_id && orgCurrencyMap.has(camp.organization_id)) {
        return orgCurrencyMap.get(camp.organization_id)!;
      }
    }

    // אחרת – לפי הארגון שנבחר
    if (selectedOrgId && orgCurrencyMap.has(selectedOrgId)) {
      return orgCurrencyMap.get(selectedOrgId)!;
    }

    return "ILS";
  }, [campaignId, campaigns, orgCurrencyMap, selectedOrgId]);

  /* =======================================================
     SAVE DONATION
  ======================================================= */
  if (!donor) return null;

  const handleSave = async () => {
    const num = parseFloat(amount);

    if (!selectedOrgId) {
      alert(t("errors.organizationRequired") || "Please select organization");
      return;
    }

    if (!donor.id) {
      alert("Missing donor id");
      return;
    }

    if (!amount || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    await createDonation.mutateAsync({
      donor_id: donor.id,
      organization_id: selectedOrgId,
      amount: num,
      currency: effectiveCurrency,
      type,
      designation,
      payment_method: paymentMethod,
      date: new Date(date).toISOString(),
      status,
      notes,
      campaign_id: campaignId || null,
    });

    onClose();
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
          {/* ORGANIZATION (super_admin on ALL בלבד) */}
          {isGlobalSuperAdmin && organizationId === "all" && (
            <div>
              <div>{t("common.organization") || "Organization"}</div>
              <select
                className="w-full border rounded-md h-9 px-2 bg-background"
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  setCampaignId("");
                }}
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
          )}

          {/* AMOUNT + CURRENCY */}
          <div>
            <div>
              {t("donations.amount")}{" "}
              <span className="text-gray-500">
                ({effectiveCurrency || "ILS"})
              </span>
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
              disabled={!selectedOrgId}
            >
              <option value="">
                {t("donations.selectCampaign") || "Select campaign"}
              </option>
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
