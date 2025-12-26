// src/components/AddPledgeDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreatePledge } from "@/hooks/usePledges";
import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CampaignRow = { id: string; name: string | null };

type Props = {
  donor: any;
  open: boolean;
  onClose: () => void;
};

export default function AddPledgeDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId } = useUser();

  const createPledge = useCreatePledge();

  // ---------------------------
  // Local state
  // ---------------------------
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string | "">("");

  // Reset on dialog open
  useEffect(() => {
    if (open) {
      setTotalAmount("");
      setDueDate("");
      setNotes("");
      setCampaignId("");
    }
  }, [open]);

  // ---------------------------
  // Load organization currency
  // ---------------------------
  const { data: settings } = useQuery({
    queryKey: ["org-settings-for-pledges", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("default_currency")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  const currency = settings?.default_currency || "USD";

  // ---------------------------
  // Load campaigns for this org
  // ---------------------------
  const { data: campaigns = [] } = useQuery({
    queryKey: ["pledge-campaigns", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return (data || []) as CampaignRow[];
    },
  });

  // ---------------------------
  // If donor missing → show dialog
  // ---------------------------
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
    donor.phone ||
    "Donor";

  // ---------------------------
  // Save pledge
  // ---------------------------
  const handleSave = async () => {
    const num = Number(totalAmount);

    if (!num || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    await createPledge.mutateAsync({
      donor_id: donor.id,
      organization_id: organizationId!,
      total_amount: num,
      due_date: dueDate || null,
      notes: notes || null,
      campaign_id: campaignId || null,
      currency, // <-- MULTICURRENCY FIX
    });

    onClose();
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("pledges.addPledge") || "Add Pledge"} – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">

          {/* AMOUNT */}
          <div>
            <div>
              {t("pledges.amount") || "Amount"} ({currency})
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          {/* DUE DATE */}
          <div>
            <div>{t("pledges.dueDate") || "Due Date"}</div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* CAMPAIGN */}
          <div>
            <div>{t("sidebar.campaigns") || "Campaign"}</div>
            <select
              className="w-full border rounded-md px-2 py-1 h-9 bg-background"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">
                {t("pledges.selectCampaign") ||
                  "Select campaign (optional)"}
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
            <div>{t("pledges.notes") || "Notes"}</div>
            <textarea
              className="w-full border rounded-md px-2 py-1 text-sm min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={createPledge.isLoading}>
              {t("common.save") || "Save"}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
