// src/components/AddYahrzeitDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
import { useCreateYahrzeit } from "@/hooks/useYahrzeits";
import { useCreateDonation } from "@/hooks/useDonations";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddYahrzeitDialog({ open, onClose }: Props) {
  const { t, currency } = useLanguage();
  const { organizationId, isGlobalSuperAdmin, setOrganizationId } = useUser();

  const { organizations } = useOrganizations();
  const createYahrzeit = useCreateYahrzeit();
  const createDonation = useCreateDonation();

  // האם חייבים לבחור ארגון בתוך הדיאלוג (super_admin ב־ALL)
  const mustChooseOrgInsideDialog =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  // org שנבחר בתוך הדיאלוג
  const [selectedOrg, setSelectedOrg] = useState<string>(
    mustChooseOrgInsideDialog ? "" : organizationId || ""
  );

  // donors לפי ארגון נבחר
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
    donation_amount: "", // שדה חדש – תרומה
  });

  const currentOrg =
    organizations.find((o: any) => o.id === selectedOrg) || null;

  /* -------------------------------------------------
     RESET כשפותחים את הדיאלוג
  ------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    const initialOrg = mustChooseOrgInsideDialog ? "" : organizationId || "";

    setSelectedOrg(initialOrg);

    setForm({
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
      donation_amount: "",
    });

    setSameAsDonor(false);
  }, [open, organizationId, mustChooseOrgInsideDialog]);

  /* -------------------------------------------------
     super_admin בוחר ארגון
  ------------------------------------------------- */
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setOrganizationId(orgId);

    setForm((prev) => ({
      ...prev,
      donor_id: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
    }));
    setSameAsDonor(false);
  };

  /* -------------------------------------------------
     בחירת תורם
  ------------------------------------------------- */
  const handleSelectDonor = (donorId: string) => {
    setForm((prev) => ({
      ...prev,
      donor_id: donorId,
    }));
  };

  /* -------------------------------------------------
     SAME-AS-DONOR
  ------------------------------------------------- */
  useEffect(() => {
    if (!sameAsDonor || !form.donor_id) return;

    const d = donors.find((x: any) => x.id === form.donor_id);
    if (!d) return;

    const nameFromDonor =
      d.display_name ||
      `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();

    setForm((prev) => ({
      ...prev,
      contact_name: nameFromDonor || "",
      contact_email: d.email || "",
      contact_phone: d.phone || "",
    }));
  }, [sameAsDonor, form.donor_id, donors]);

  /* -------------------------------------------------
     SUBMIT
  ------------------------------------------------- */
  const handleSave = async () => {
    const finalOrgId =
      selectedOrg || (isGlobalSuperAdmin ? null : organizationId);

    if (!finalOrgId) {
      toast.error("Please select organization");
      return;
    }

    if (!form.donor_id) {
      toast.error("Please select donor");
      return;
    }

    if (!form.deceased_name.trim()) {
      toast.error("Please enter deceased name");
      return;
    }

    if (!form.secular_date) {
      toast.error("Please provide secular date");
      return;
    }

    const yahrzeitPayload = {
      donor_id: form.donor_id,
      organization_id: finalOrgId,
      deceased_name: form.deceased_name.trim(),
      hebrew_date: form.hebrew_date || null,
      secular_date: form.secular_date,
      relationship: form.relationship || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      prayer_text: form.prayer_text || null,
      reminder_enabled: form.reminder_enabled,
    };

    // חישוב סכום תרומה – דיפולט 0
    let amountNumber = Number(form.donation_amount || 0);
    if (Number.isNaN(amountNumber)) {
      amountNumber = 0;
    }

    try {
      // 1) יצירת Yahrzeit
      const created = await createYahrzeit.mutateAsync(yahrzeitPayload);

      // 2) יצירת Donation מקושר (גם אם 0)
      if (created && created.id) {
        const donationPayload = {
          donor_id: form.donor_id,
          organization_id: finalOrgId,
          campaign_id: null,
          amount: amountNumber,
          currency: currency || "ILS",
          type: "yahrzeit",
          designation: `Yahrzeit for ${form.deceased_name.trim()}`,
          payment_method: "manual",
          date: new Date().toISOString(),
          receipt_number: null,
          status: "completed",
          fee: 0,
          net_amount: amountNumber,
          notes: form.prayer_text || null,
          category: "yahrzeit",
          yahrzeit_id: created.id,
        };

        await createDonation.mutateAsync(donationPayload);
      }

      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error creating yahrzeit");
    }
  };

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("yahrzeits.addTitle") || "Add Yahrzeit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* GROUP 1: ORG & DONOR */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupOrgDonor") || "Organization & Donor"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ORG SELECT – super_admin בלבד */}
              {isGlobalSuperAdmin && (
                <div className="space-y-1">
                  <Label>{t("yahrzeits.organization") || "Organization"}</Label>
                  <Select
                    value={selectedOrg}
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
              )}

              {/* USER רגיל – מציג שם ארגון בלבד */}
              {!isGlobalSuperAdmin && (
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
                  disabled={!selectedOrg && mustChooseOrgInsideDialog}
                  value={form.donor_id}
                  onValueChange={handleSelectDonor}
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
                onCheckedChange={(c) => setSameAsDonor(Boolean(c))}
              />
              <Label className="text-sm">
                {t("yahrzeits.contactSameAsDonor") ||
                  "Contact person is the donor"}
              </Label>
            </div>
          </div>

          {/* GROUP 2: CONTACT INFO */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupContact") || "Contact information"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NAME */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.contactName") || "Contact name"}</Label>
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

              {/* EMAIL */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.contactEmail") || "Contact email"}</Label>
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

              {/* PHONE */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.contactPhone") || "Contact phone"}</Label>
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

          {/* GROUP 3: YAHRZEIT DETAILS + DONATION + REMINDER */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupDetails") || "Yahrzeit details"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SECULAR DATE */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.secularDate") || "Secular date"}</Label>
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

              {/* HEBREW DATE */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.hebrewDate") || "Hebrew date"}</Label>
                <Input
                  placeholder="e.g. 10 Nissan"
                  value={form.hebrew_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      hebrew_date: e.target.value,
                    }))
                  }
                />
              </div>

              {/* DECEASED */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.deceased") || "Deceased name"}</Label>
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

              {/* RELATIONSHIP */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.relationship") || "Relationship"}</Label>
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

            {/* PRAYER TEXT */}
            <div className="space-y-1">
              <Label>{t("yahrzeits.prayerText") || "Prayer text"}</Label>
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

            {/* DONATION AMOUNT */}
            <div className="space-y-1">
              <Label>
                {t("yahrzeits.donationAmount") || "Donation amount"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.donation_amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    donation_amount: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("yahrzeits.donationHint") ||
                  "Leave empty for 0; you can update the amount later."}
              </p>
            </div>

            {/* REMINDER ENABLED */}
            <div className="flex items-center gap-2 pt-1">
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
                {t("yahrzeits.reminderEnabled") ||
                  "Send yearly reminder"}
              </Label>
            </div>
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
