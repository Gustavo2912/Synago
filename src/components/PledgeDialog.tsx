import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { useCreatePledge } from "@/hooks/usePledges";
import { useUserOrganizations } from "@/hooks/useUserOrganizations";
import { useCampaigns } from "@/hooks/useCampaigns";
import { toast } from "sonner";

export function PledgeDialog({
  open,
  onOpenChange,
  donorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  donorId: string;
}) {
  const { t } = useLanguage();
  const createPledge = useCreatePledge();

  const { data: userOrgs } = useUserOrganizations();
  const { data: campaigns } = useCampaigns();

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [orgCampaigns, setOrgCampaigns] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    total_amount: "",
    frequency: "one_time",
    status: "Active",
    campaign_id: "",
  });

  /* ---------------------------------------------
     AUTO SELECT ORGANIZATION IF USER HAS ONLY ONE
  ----------------------------------------------*/
  useEffect(() => {
    if (userOrgs && userOrgs.length === 1) {
      setSelectedOrg(userOrgs[0].organization_id);
    }
  }, [userOrgs]);

  /* ---------------------------------------------
     FILTER CAMPAIGNS FOR SELECTED ORG
  ----------------------------------------------*/
  useEffect(() => {
    if (!campaigns || !selectedOrg) return;

    const filtered = campaigns.filter(
      (c) => c.organization_id === selectedOrg
    );

    setOrgCampaigns(filtered);
  }, [campaigns, selectedOrg]);

  /* ---------------------------------------------
     SUBMIT
  ----------------------------------------------*/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorId) {
      toast.error("Invalid donor");
      return;
    }
    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }
    if (!formData.total_amount) {
      toast.error("Please enter a total amount");
      return;
    }

    try {
      await createPledge.mutateAsync({
        donor_id: donorId,
        organization_id: selectedOrg,
        campaign_id: formData.campaign_id || null,
        total_amount: Number(formData.total_amount),
        amount_paid: 0,
        balance_owed: Number(formData.total_amount),
        reminder_enabled: false,
        status: formData.status,
        frequency: formData.frequency,
      });

      toast.success(t("pledges.created"));
      onOpenChange(false);

      setFormData({
        total_amount: "",
        frequency: "one_time",
        status: "Active",
        campaign_id: "",
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border/50 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("pledges.addPledge")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ---------------- ORG SELECT ---------------- */}
          <div>
            <Label>{t("organizations.title")} *</Label>
            <Select
              value={selectedOrg}
              onValueChange={(v) => setSelectedOrg(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("organizations.select")} />
              </SelectTrigger>
              <SelectContent>
                {userOrgs?.map((uo) => (
                  <SelectItem key={uo.organization_id} value={uo.organization_id}>
                    {uo.organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ---------------- CAMPAIGN SELECT ---------------- */}
          <div>
            <Label>{t("campaigns.title")}</Label>
            <Select
              value={formData.campaign_id}
              onValueChange={(v) =>
                setFormData({ ...formData, campaign_id: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign (optional)" />
              </SelectTrigger>
              <SelectContent>
                {orgCampaigns.length === 0 && (
                  <div className="px-3 py-2 text-muted-foreground text-sm">
                    No campaigns found
                  </div>
                )}

                {orgCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ---------------- AMOUNT ---------------- */}
          <div>
            <Label>{t("pledges.totalAmount")} *</Label>
            <Input
              type="number"
              value={formData.total_amount}
              onChange={(e) =>
                setFormData({ ...formData, total_amount: e.target.value })
              }
            />
          </div>

          {/* ---------------- FREQUENCY ---------------- */}
          <div>
            <Label>{t("pledges.frequency")}</Label>
            <Select
              value={formData.frequency}
              onValueChange={(v) =>
                setFormData({ ...formData, frequency: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">{t("pledges.freq.oneTime")}</SelectItem>
                <SelectItem value="monthly">{t("pledges.freq.monthly")}</SelectItem>
                <SelectItem value="yearly">{t("pledges.freq.yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ---------------- STATUS ---------------- */}
          <div>
            <Label>{t("pledges.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(v) =>
                setFormData({ ...formData, status: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">{t("pledges.status.active")}</SelectItem>
                <SelectItem value="Closed">{t("pledges.status.closed")}</SelectItem>
                <SelectItem value="Cancelled">{t("pledges.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ---------------- ACTIONS ---------------- */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
