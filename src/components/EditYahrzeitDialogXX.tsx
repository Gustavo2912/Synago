// src/components/EditYahrzeitDialog.tsx
import React, { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  useUpdateYahrzeit,
  useDeleteYahrzeit,
} from "@/hooks/useYahrzeits";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useDonors } from "@/hooks/useDonors";
import { useUpsertYahrzeitDonation } from "@/hooks/useDonations";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  yahrzeit: any | null;
};

export default function EditYahrzeitDialog({ open, onClose, yahrzeit }: Props) {
  const { t, currency: defaultCurrency } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const updateYahrzeit = useUpdateYahrzeit();
  const deleteYahrzeit = useDeleteYahrzeit();
  const upsertDonation = useUpsertYahrzeitDonation();

  const { organizations } = useOrganizations();

  const mustChooseOrgInsideDialog =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  const [selectedOrg, setSelectedOrg] = useState<string>("");

  const donorsQuery = useDonors({
    search: "",
    organizationId: selectedOrg,
  });
  const donors = donorsQuery.data || [];

  const [sameAsDonor, setSameAsDonor] = useState(false);

  const [form, setForm] = useState({
    donor_id: "",
    deceased_name: "",
    relationship: "",
    secular_date: "",
    hebrew_date: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    prayer_text: "",
    reminder_enabled: false,
  });

  // donation state
  const [donationId, setDonationId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>("0");
  const [donationCurrency, setDonationCurrency] = useState<string>("USD");

  /* ----------------------------------------------------
      LOAD INITIAL DATA
  ---------------------------------------------------- */
  useEffect(() => {
    if (!open || !yahrzeit) return;

    const initialOrg = mustChooseOrgInsideDialog
      ? yahrzeit.organization_id
      : organizationId || yahrzeit.organization_id;

    setSelectedOrg(initialOrg || "");

    setForm({
      donor_id: yahrzeit.donor_id || "",
      deceased_name: yahrzeit.deceased_name || "",
      relationship: yahrzeit.relationship || "",
      secular_date: yahrzeit.secular_date?.substring(0, 10) || "",
      hebrew_date: yahrzeit.hebrew_date || "",
      contact_name: yahrzeit.contact_name || "",
      contact_email: yahrzeit.contact_email || "",
      contact_phone: yahrzeit.contact_phone || "",
      prayer_text: yahrzeit.prayer_text || "",
      reminder_enabled: yahrzeit.reminder_enabled ?? false,
    });

    if (
      yahrzeit.contact_email &&
      yahrzeit.donor_email &&
      yahrzeit.contact_email === yahrzeit.donor_email
    ) {
      setSameAsDonor(true);
    } else {
      setSameAsDonor(false);
    }

    // load existing donation for this yahrzeit (if any)
    let cancelled = false;

    (async () => {
      if (!yahrzeit?.id) return;

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("category", "yahrzeit")
        .eq("yahrzeit_id", yahrzeit.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("❌ Failed loading yahrzeit donation:", error);
        setDonationId(null);
        setDonationAmount("0");
        setDonationCurrency(defaultCurrency || "USD");
        return;
      }

      if (data) {
        setDonationId(data.id);
        setDonationAmount(String(data.amount ?? 0));
        setDonationCurrency(data.currency || defaultCurrency || "USD");
      } else {
        setDonationId(null);
        setDonationAmount("0");
        setDonationCurrency(defaultCurrency || "USD");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, yahrzeit, organizationId, mustChooseOrgInsideDialog, defaultCurrency]);

  /* ----------------------------------------------------
      ORG SELECTION (super_admin only)
  ---------------------------------------------------- */
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setForm((prev) => ({ ...prev, donor_id: "" }));
    setSameAsDonor(false);
  };

  /* ----------------------------------------------------
      ON DONOR CHANGE
  ---------------------------------------------------- */
  const handleSelectDonor = (donorId: string) => {
    setForm((prev) => ({
      ...prev,
      donor_id: donorId,
    }));
  };

  /* ----------------------------------------------------
      SAME-AS-DONOR → auto-fill contact info
  ---------------------------------------------------- */
  useEffect(() => {
    if (!sameAsDonor || !form.donor_id) return;
    const d = donors.find((x: any) => x.id === form.donor_id);
    if (!d) return;

    const name =
      d.display_name ||
      `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();

    setForm((prev) => ({
      ...prev,
      contact_name: name,
      contact_email: d.email || "",
      contact_phone: d.phone || "",
    }));
  }, [sameAsDonor, form.donor_id, donors]);

  /* ----------------------------------------------------
      SAVE
  ---------------------------------------------------- */
  const handleSave = async () => {
    if (!yahrzeit) return;

    if (!form.donor_id) {
      toast.error("Please select donor");
      return;
    }
    if (!form.deceased_name.trim()) {
      toast.error("Please enter deceased name");
      return;
    }
    if (!form.secular_date) {
      toast.error("Please select secular date");
      return;
    }

    const finalOrgId =
      selectedOrg ||
      (!mustChooseOrgInsideDialog ? organizationId : null) ||
      yahrzeit.organization_id;

    if (!finalOrgId) {
      toast.error("Organization is missing");
      return;
    }

    const amountNum = Number(donationAmount || 0);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      toast.error("Invalid donation amount");
      return;
    }

    const donationCurr = donationCurrency || defaultCurrency || "USD";

    try {
      // 1) update yahrzeit
      await updateYahrzeit.mutateAsync({
        id: yahrzeit.id,
        donor_id: form.donor_id,
        organization_id: finalOrgId,
        deceased_name: form.deceased_name.trim(),
        relationship: form.relationship || null,
        secular_date: form.secular_date,
        hebrew_date: form.hebrew_date || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        prayer_text: form.prayer_text || null,
        reminder_enabled: form.reminder_enabled,
      });

      // 2) upsert donation (סכום + מטבע)
      await upsertDonation.mutateAsync({
        id: donationId || undefined,
        yahrzeitId: yahrzeit.id,
        donorId: form.donor_id,
        organizationId: finalOrgId,
        amount: amountNum,
        currency: donationCurr,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error updating Yahrzeit");
    }
  };

  /* ----------------------------------------------------
      DELETE
  ---------------------------------------------------- */
  const handleDelete = async () => {
    if (!yahrzeit) return;

    if (
      !confirm(
        t("yahrzeits.confirmDelete") ||
          "Delete this Yahrzeit?"
      )
    )
      return;

    try {
      await deleteYahrzeit.mutateAsync(yahrzeit.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error deleting Yahrzeit");
    }
  };

  if (!yahrzeit) return null;

  /* ----------------------------------------------------
      RENDER
  ---------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("yahrzeits.editTitle") || "Edit Yahrzeit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* =================== GROUP 1: ORG & DONOR =================== */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupOrgDonor") || "Organization & Donor"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ORG SELECT – only super_admin */}
              {isGlobalSuperAdmin ? (
                <div className="space-y-1">
                  <Label>
                    {t("yahrzeits.organization") || "Organization"}
                  </Label>

                  <Select
                    value={selectedOrg}
                    onValueChange={handleSelectOrg}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>
                    {t("yahrzeits.organization") || "Organization"}
                  </Label>
                  <div className="border rounded px-3 py-2 text-sm bg-muted">
                    {
                      organizations.find(
                        (o: any) => o.id === yahrzeit.organization_id
                      )?.name
                    }
                  </div>
                </div>
              )}

              {/* DONOR SELECT */}
              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.donor") || "Donor"}
                </Label>

                <Select
                  value={form.donor_id}
                  onValueChange={handleSelectDonor}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        donorsQuery.isLoading
                          ? (t("common.loading") || "Loading...")
                          : (t("yahrzeits.selectDonor") || "Select donor")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.display_name ||
                          `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SAME-AS-DONOR */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={sameAsDonor}
                onCheckedChange={(v) => setSameAsDonor(Boolean(v))}
              />
              <Label className="text-sm">
                {t("yahrzeits.contactSameAsDonor") ||
                  "Contact is donor"}
              </Label>
            </div>
          </div>

          {/* =================== GROUP 2: CONTACT =================== */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupContact") || "Contact information"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.contactName") || "Contact name"}
                </Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contact_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.contactEmail") || "Contact email"}
                </Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contact_email: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.contactPhone") || "Contact phone"}
                </Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contact_phone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* =================== GROUP 3: DETAILS =================== */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupDetails") || "Yahrzeit details"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.secularDate") || "Secular date"}
                </Label>
                <Input
                  type="date"
                  value={form.secular_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secular_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.hebrewDate") || "Hebrew date"}
                </Label>
                <Input
                  value={form.hebrew_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      hebrew_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.deceased") || "Deceased name"}
                </Label>
                <Input
                  value={form.deceased_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deceased_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.relationship") || "Relationship"}
                </Label>
                <Input
                  value={form.relationship}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      relationship: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>
                {t("yahrzeits.prayerText") || "Prayer text"}
              </Label>
              <Textarea
                rows={3}
                value={form.prayer_text}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    prayer_text: e.target.value,
                  }))
                }
              />
            </div>

            {/* REMINDER TOGGLE */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={form.reminder_enabled}
                onCheckedChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    reminder_enabled: Boolean(v),
                  }))
                }
              />
              <Label className="text-sm">
                {t("yahrzeits.withReminders") || "Send yearly reminder email"}
              </Label>
            </div>
          </div>

          {/* =================== GROUP 4: DONATION =================== */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupDonation") || "Yahrzeit donation"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.donationAmount") || "Amount"}
                </Label>
                <Input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {t("yahrzeits.currency") || "Currency"}
                </Label>
                <Select
                  value={donationCurrency}
                  onValueChange={setDonationCurrency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* =================== ACTIONS =================== */}
          <DialogFooter className="flex justify-between mt-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              {t("common.delete") || "Delete"}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel") || "Cancel"}
              </Button>

              <Button onClick={handleSave}>
                {t("common.save") || "Save"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
