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

type Props = {
  donor: any;
  open: boolean;
  onClose: () => void;
};

export default function AddDonationDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const createDonation = useCreateDonation();

  /* ---------------- FORM STATE ---------------- */
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Regular");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("Succeeded");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");

  /* ---------------- RESET ON OPEN ---------------- */
  useEffect(() => {
    if (open) {
      setAmount("");
      setType("Regular");
      setPaymentMethod("Cash");
      setDesignation("");
      setStatus("Succeeded");
      setNotes("");
      setCampaignId("");
      setDate(new Date().toISOString().slice(0, 10));

      // super admin with ALL MUST choose org manually
      if (organizationId !== "all") {
        setSelectedOrg(organizationId);
      } else {
        setSelectedOrg(null);
      }
    }
  }, [open, organizationId]);

  /* ---------------------------------------------------
     LOAD ORGANIZATIONS (for super_admin choosing org)
  --------------------------------------------------- */
  const { data: organizations = [] } = useQuery({
    queryKey: ["all-organizations"],
    enabled: isGlobalSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  /* ---------------------------------------------------
     LOAD CAMPAIGNS FOR SELECTED ORG
  --------------------------------------------------- */
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-for-org", selectedOrg],
    enabled: !!selectedOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, organization_id")
        .eq("organization_id", selectedOrg);

      if (error) throw error;
      return data || [];
    },
  });

  /* ---------------------------------------------------
     LOAD ORG SETTINGS → currency
  --------------------------------------------------- */
  const { data: settings = [] } = useQuery({
    queryKey: ["settings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("organization_id, default_currency");
      if (error) throw error;
      return data || [];
    },
  });

  const currencyMap = useMemo(() => {
    const m = new Map();
    settings.forEach((s) =>
      m.set(s.organization_id, s.default_currency || "ILS")
    );
    return m;
  }, [settings]);

  /* ---------------------------------------------------
     EFFECTIVE CURRENCY
  --------------------------------------------------- */
  const effectiveCurrency = useMemo(() => {
    if (!selectedOrg) return "ILS";
    return currencyMap.get(selectedOrg) || "ILS";
  }, [selectedOrg, currencyMap]);

  /* ---------------------------------------------------
     SAVE DONATION
  --------------------------------------------------- */
  const handleSave = async () => {
    if (!donor?.id) {
      alert("Missing donor ID");
      return;
    }

    if (!selectedOrg) {
      alert("Please select an organization.");
      return;
    }

    const num = parseFloat(amount);
    if (!num || num <= 0) {
      alert("Invalid amount");
      return;
    }

    await createDonation.mutateAsync({
      donor_id: donor.id,
      organization_id: selectedOrg,
      campaign_id: campaignId || null,

      amount: num,
      currency: effectiveCurrency,
      type,
      designation,
      payment_method: paymentMethod,
      date: new Date(date).toISOString(),
      status,
      notes,
    });

    onClose();
  };

  if (!donor) return null;

  const fullName =
    donor.display_name ||
    `${donor.first_name || ""} ${donor.last_name || ""}`.trim();

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("donors.addDonation")} – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto p-1 text-sm">

          {/* ORG SELECT FOR SUPER ADMIN */}
          {organizationId === "all" && (
            <div>
              <div>{t("common.organization")}</div>
              <select
                className="w-full border rounded-md h-9 px-2"
                value={selectedOrg || ""}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">Select organization</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AMOUNT */}
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
            <div>{t("donations.designation")}</div>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          {/* CAMPAIGN */}
          {!!selectedOrg && (
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
          )}

          {/* NOTES */}
          <div>
            <div>{t("common.notes")}</div>
            <textarea
              className="w-full border rounded-md text-sm px-2 py-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

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
