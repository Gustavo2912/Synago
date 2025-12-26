// src/components/AddPledgeDialog.tsx

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreatePledge } from "@/hooks/usePledges";
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

export default function AddPledgeDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const createPledge = useCreatePledge();

  /* ---------------- FORM STATE ---------------- */
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");

  /* ---------------- RESET WHEN OPEN ---------------- */
  useEffect(() => {
    if (open) {
      setTotalAmount("");
      setDueDate("");
      setNotes("");
      setCampaignId("");

      // אם לא ב־ALL — קובעים ארגון מההקשר
      if (organizationId !== "all") {
        setSelectedOrg(organizationId);
      } else {
        setSelectedOrg(null); // super admin → חייב לבחור ידנית
      }
    }
  }, [open, organizationId]);

  /* ==========================================================
     LOAD ALL ORGANIZATIONS (ONLY for super_admin ALL)
  ========================================================== */
  const { data: organizations = [] } = useQuery({
    queryKey: ["pledge-all-orgs"],
    enabled: isGlobalSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  /* ==========================================================
     LOAD CAMPAIGNS FOR THE SELECTED ORG
  ========================================================== */
  const { data: campaigns = [] } = useQuery({
    queryKey: ["pledge-campaigns", selectedOrg],
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

  /* ==========================================================
     LOAD ORG SETTINGS → currency
  ========================================================== */
  const { data: settings = [] } = useQuery({
    queryKey: ["pledge-org-settings-all"],
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
    settings.forEach((s) => m.set(s.organization_id, s.default_currency || "ILS"));
    return m;
  }, [settings]);

  const effectiveCurrency = useMemo(() => {
    if (!selectedOrg) return "ILS";
    return currencyMap.get(selectedOrg) || "ILS";
  }, [selectedOrg, currencyMap]);

  /* ==========================================================
     SAVE HANDLER
  ========================================================== */
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

  const fullName =
    donor.display_name ||
    `${donor.first_name || ""} ${donor.last_name || ""}`.trim() ||
    donor.email ||
    donor.phone;

  const handleSave = async () => {
    if (!selectedOrg) {
      alert("Please select an organization");
      return;
    }

    const num = Number(totalAmount);
    if (!num || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    await createPledge.mutateAsync({
      donor_id: donor.id,
      organization_id: selectedOrg,
      total_amount: num,
      campaign_id: campaignId || null,
      due_date: dueDate || null,
      notes: notes || null,
      currency: effectiveCurrency,
    });

    onClose();
  };

  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("pledges.addPledge")} – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">

          {/* -----------------------------------------------------
              ORGANIZATION SELECT — ONLY FOR SUPER ADMIN / ALL
          ------------------------------------------------------ */}
          {organizationId === "all" && (
            <div>
              <div>{t("common.organization")}</div>
              <select
                className="w-full border rounded-md h-9 px-2 bg-background"
                value={selectedOrg || ""}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">{t("common.selectOrganization")}</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* -----------------------------------------------------
              AMOUNT
          ------------------------------------------------------ */}
          <div>
            <div>
              {t("pledges.amount")}{" "}
              <span className="text-gray-500">({effectiveCurrency})</span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          {/* -----------------------------------------------------
              DUE DATE
          ------------------------------------------------------ */}
          <div>
            <div>{t("pledges.dueDate")}</div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* -----------------------------------------------------
              CAMPAIGN
          ------------------------------------------------------ */}
          {selectedOrg && (
            <div>
              <div>{t("sidebar.campaigns")}</div>
              <select
                className="w-full border rounded-md px-2 py-1 h-9 bg-background"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">
                  {t("pledges.selectCampaign") || "Select campaign (optional)"}
                </option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* -----------------------------------------------------
              NOTES
          ------------------------------------------------------ */}
          <div>
            <div>{t("pledges.notes")}</div>
            <textarea
              className="w-full border rounded-md px-2 py-1 text-sm min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* -----------------------------------------------------
              BUTTONS
          ------------------------------------------------------ */}
          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={createPledge.isPending}>
              {t("common.save")}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
