// src/components/AddPledgeDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useCreatePledge } from "@/hooks/usePledges";
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

export default function AddPledgeDialog({ donor, open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();
  const { organizations } = useOrganizations();
  const createPledge = useCreatePledge();

  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string | "">("");

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // reset on open
  useEffect(() => {
    if (!open) return;

    setTotalAmount("");
    setDueDate("");
    setNotes("");
    setCampaignId("");

    if (!isGlobalSuperAdmin || organizationId !== "all") {
      setSelectedOrgId(organizationId || "");
    } else if (organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    } else {
      setSelectedOrgId("");
    }
  }, [open, organizationId, isGlobalSuperAdmin, organizations]);

  // campaigns for org
  const { data: campaigns = [] } = useQuery({
    queryKey: ["pledge-campaigns", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, organization_id")
        .eq("organization_id", selectedOrgId);

      if (error) throw error;
      return (data || []) as CampaignRow[];
    },
  });

  // org settings (currency)
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
      map.set(s.organization_id, s.default_currency || "ILS");
    });
    return map;
  }, [orgSettings]);

  const effectiveCurrency = useMemo(() => {
    if (selectedOrgId && orgCurrencyMap.has(selectedOrgId)) {
      return orgCurrencyMap.get(selectedOrgId)!;
    }
    return "ILS";
  }, [selectedOrgId, orgCurrencyMap]);

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

  const handleSave = async () => {
    const num = Number(totalAmount);

    if (!selectedOrgId) {
      alert(t("errors.organizationRequired") || "Please select organization");
      return;
    }

    if (!num || isNaN(num) || num <= 0) {
      alert(t("errors.amountInvalid") || "Invalid amount");
      return;
    }

    await createPledge.mutateAsync({
      donor_id: donor.id,
      organization_id: selectedOrgId,
      total_amount: num,
      due_date: dueDate || null,
      notes: notes || null,
      campaign_id: campaignId || null,
      currency: effectiveCurrency,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("pledges.addPledge") || "Add Pledge"} – {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* ORG (super_admin ALL) */}
          {isGlobalSuperAdmin && organizationId === "all" && (
            <div>
              <div>{t("common.organization") || "Organization"}</div>
              <select
                className="w-full border rounded-md px-2 py-1 h-9 bg-background"
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

          <div>
            <div>
              {t("pledges.amount") || "Amount"}{" "}
              <span className="text-gray-500">
                ({effectiveCurrency || "ILS"})
              </span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          <div>
            <div>{t("pledges.dueDate") || "Due Date"}</div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <div>{t("sidebar.campaigns") || "Campaign"}</div>
            <select
              className="w-full border rounded-md px-2 py-1 h-9 bg-background"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              disabled={!selectedOrgId}
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

          <div>
            <div>{t("pledges.notes") || "Notes"}</div>
            <textarea
              className="w-full border rounded-md px-2 py-1 text-sm min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

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
