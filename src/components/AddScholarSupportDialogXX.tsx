import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useDonors } from "@/hooks/useDonors";
import { useCreatePledge } from "@/hooks/usePledges";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddScholarSupportDialog({ open, onClose }: Props) {
  const { t, currency } = useLanguage();
  const { organizationId, isGlobalSuperAdmin, setOrganizationId } = useUser();

  const { organizations } = useOrganizations();
  const createPledge = useCreatePledge();

  // super_admin שנכנס עם ALL חייב לבחור ארגון מתוך הדיאלוג
  const mustChooseOrgInsideDialog =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  const [selectedOrg, setSelectedOrg] = useState<string>(
    mustChooseOrgInsideDialog ? "" : organizationId || ""
  );

  // donors של הארגון הנבחר
  const donorsQuery = useDonors({
    search: "",
    organizationId: selectedOrg,
  });
  const donors = donorsQuery.data || [];

  // plans מתוך organization_scholar_plans
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // בחירות המשתמש
  const [donorId, setDonorId] = useState<string>("");
  const [planId, setPlanId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const currentOrg =
    organizations.find((o: any) => o.id === selectedOrg) || null;

  /* -------------------------------------------
     RESET כשפותחים את הדיאלוג
  ------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    const initialOrg = mustChooseOrgInsideDialog ? "" : organizationId || "";

    setSelectedOrg(initialOrg);
    setDonorId("");
    setPlanId("");
    setNotes("");
    setPlans([]);
  }, [open, organizationId, mustChooseOrgInsideDialog]);

  /* -------------------------------------------
     טוענים plans לפי org
  ------------------------------------------- */
  useEffect(() => {
    if (!selectedOrg) {
      setPlans([]);
      return;
    }

    const loadPlans = async () => {
      setPlansLoading(true);
      const { data, error } = await supabase
        .from("organization_scholar_plans")
        .select("*")
        .eq("organization_id", selectedOrg)
        .order("amount");

      if (error) {
        console.error(error);
        toast.error("Error loading scholar plans");
        setPlans([]);
      } else {
        setPlans(data || []);
      }

      setPlansLoading(false);
    };

    loadPlans();
  }, [selectedOrg]);

  /* -------------------------------------------
     בחירת ארגון ע״י super_admin
  ------------------------------------------- */
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setOrganizationId(orgId); // כמו ב־AddYahrzeit

    setDonorId("");
    setPlanId("");
  };

  /* -------------------------------------------
     SAVE – יצירת pledge מסוג torah_scholar
  ------------------------------------------- */
  const handleSave = async () => {
    const finalOrgId =
      selectedOrg || (!isGlobalSuperAdmin ? organizationId : null);

    if (!finalOrgId) {
      toast.error("Please select organization");
      return;
    }

    if (!donorId) {
      toast.error("Please select donor");
      return;
    }

    if (plans.length === 0) {
      toast.error(
        "No scholar support plans defined for this organization. Please create plans in settings first."
      );
      return;
    }

    if (!planId) {
      toast.error("Please select support plan");
      return;
    }

    const plan = plans.find((p: any) => p.id === planId);
    if (!plan) {
      toast.error("Invalid plan selected");
      return;
    }

    try {
      await createPledge.mutateAsync({
        donor_id: donorId,
        organization_id: finalOrgId,
        total_amount: plan.amount,
        due_date: null,
        notes: notes || null,
        campaign_id: null,
        currency: currency || "ILS",
        // שני השדות הבאים מצריכים הרחבה של ה־Edge Function/Hook אם טרם נעשה:
        frequency: "monthly",
        category: "torah_scholar",
      } as any);

      toast.success("Scholar support added");
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error creating scholar support");
    }
  };

  /* -------------------------------------------
     UI
  ------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("torahScholar.addSupportTitle") || "Add Scholar Support"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ORG + DONOR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ORGANIZATION SELECT (רק לסופר אדמין) */}
            {isGlobalSuperAdmin ? (
              <div className="space-y-1">
                <Label>{t("yahrzeits.organization") || "Organization"}</Label>
                <Select
                  value={selectedOrg || undefined}
                  onValueChange={handleSelectOrg}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        t("yahrzeits.selectOrganization") ||
                        "Select organization"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>{t("yahrzeits.organization") || "Organization"}</Label>
                <div className="border rounded px-3 py-2 bg-muted text-sm">
                  {currentOrg?.name || "-"}
                </div>
              </div>
            )}

            {/* DONOR SELECT */}
            <div className="space-y-1">
              <Label>{t("yahrzeits.donor") || "Donor"}</Label>
              <Select
                disabled={mustChooseOrgInsideDialog && !selectedOrg}
                value={donorId || undefined}
                onValueChange={setDonorId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      donorsQuery.isLoading
                        ? t("common.loading") || "Loading..."
                        : t("yahrzeits.selectDonor") || "Select donor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.display_name ||
                        `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() ||
                        d.email ||
                        d.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PLANS */}
          <div className="space-y-1">
            <Label>Support Plan</Label>

            {plansLoading ? (
              <div className="text-sm text-muted-foreground p-2">
                Loading plans...
              </div>
            ) : plans.length === 0 ? (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                No scholar support plans are defined for this organization.
                <br />
                Please create plans in the organization settings first.
              </div>
            ) : (
              <Select
                value={planId || undefined}
                onValueChange={setPlanId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} – {currency} {p.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* NOTES */}
          <div className="space-y-1">
            <Label>{t("pledges.notes") || "Notes (optional)"}</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave}>
              {t("common.save") || "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
