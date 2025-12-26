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
import { useOrgSettings } from "@/hooks/useOrgSettings";

import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddYahrzeitDialog({ open, onClose }: Props) {
  const { t } = useLanguage();
  const { organizationId, isGlobalSuperAdmin, setOrganizationId } = useUser();

  const { organizations } = useOrganizations();
  const createYahrzeit = useCreateYahrzeit();
  const createDonation = useCreateDonation();

  // ----------------------------------------------------
  // האם חייבים לבחור ארגון בתוך הדיאלוג (super_admin ב־ALL)
  // ----------------------------------------------------
  const mustChooseOrgInsideDialog =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  // org שנבחר מתוך הדיאלוג
  const [selectedOrg, setSelectedOrg] = useState<string>(
    mustChooseOrgInsideDialog ? "" : organizationId || ""
  );

  // טוענים donors לפי הארגון הנבחר
  const donorsQuery = useDonors({
    search: "",
    organizationId: selectedOrg,
  });

  const donors = donorsQuery.data || [];

  // טוענים את הגדרות הארגון (כולל default_currency)
  const { data: orgSettings } = useOrgSettings(selectedOrg);

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
    donation_amount: "",
    donation_currency: "",
  });

  const currentOrg =
    organizations.find((o: any) => o.id === selectedOrg) || null;

  // ----------------------------------------------------
  // RESET כשפותחים את הדיאלוג
  // ----------------------------------------------------
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
      donation_currency: "",
    });

    setSameAsDonor(false);
  }, [open, organizationId, mustChooseOrgInsideDialog]);

  // ----------------------------------------------------
  // כאשר נטען default_currency — נטמיע אותו אוטומטית
  // ----------------------------------------------------
  useEffect(() => {
    if (!open || !orgSettings) return;

    setForm((prev) => ({
      ...prev,
      donation_currency: orgSettings.default_currency,
    }));
  }, [open, orgSettings]);

  // ----------------------------------------------------
  // שינוי ארגון
  // ----------------------------------------------------
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrg(orgId);
    setOrganizationId(orgId);

    setForm((prev) => ({
      ...prev,
      donor_id: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      donation_currency: "",
    }));
    setSameAsDonor(false);
  };

  // ----------------------------------------------------
  // שינוי donor
  // ----------------------------------------------------
  const handleSelectDonor = (donorId: string) => {
    setForm((prev) => ({
      ...prev,
      donor_id: donorId,
    }));
  };

  // ----------------------------------------------------
  // SAME AS DONOR
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------
  const handleSave = async () => {
    const finalOrgId =
      selectedOrg ||
      (isGlobalSuperAdmin ? null : organizationId);

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

    try {
      // -------------------------
      // CREATE YAHRZEIT
      // -------------------------
      const yahrzeit = await createYahrzeit.mutateAsync({
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
      });

      // -------------------------
      // CREATE DONATION
      // -------------------------
      const donationAmount = Number(form.donation_amount || 0);

      await createDonation.mutateAsync({
        donor_id: form.donor_id,
        organization_id: finalOrgId,
        amount: donationAmount,
        currency: form.donation_currency || orgSettings?.default_currency || "ILS",
        category: "yahrzeit",
        date: form.secular_date,
        notes: `Yahrzeit donation for ${form.deceased_name}`,
      });

      toast.success("Yahrzeit created");

      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error creating yahrzeit");
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("yahrzeits.addTitle") || "Add Yahrzeit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* -------------------------------------------------------------------
             GROUP 1: ORG & DONOR
          ------------------------------------------------------------------- */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupOrgDonor") || "Organization & Donor"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ORG SELECT */}
              {isGlobalSuperAdmin && (
                <div className="space-y-1">
                  <Label>{t("yahrzeits.organization") || "Organization"}</Label>
                  <Select value={selectedOrg} onValueChange={handleSelectOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
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

              {/* USER רגיל מציג שם בלבד */}
              {!isGlobalSuperAdmin && (
                <div className="space-y-1">
                  <Label>{t("yahrzeits.organization")}</Label>
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

            {/* SAME AS DONOR */}
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

          {/* -------------------------------------------------------------------
             GROUP 2: CONTACT INFO
          ------------------------------------------------------------------- */}
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
                <Label>{t("yahrzeits.contactEmail")}</Label>
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
                <Label>{t("yahrzeits.contactPhone")}</Label>
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

          {/* -------------------------------------------------------------------
             GROUP 3: YAHRZEIT DETAILS
          ------------------------------------------------------------------- */}
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
                  placeholder="10 Nissan"
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
                <Label>{t("yahrzeits.deceased")}</Label>
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
                <Label>{t("yahrzeits.relationship")}</Label>
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
              <Label>{t("yahrzeits.prayerText")}</Label>
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
          </div>

          {/* -------------------------------------------------------------------
             GROUP 4: DONATION (NEW)
          ------------------------------------------------------------------- */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.donationTitle") || "Donation (Optional)"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AMOUNT */}
              <div className="space-y-1">
                <Label>{t("yahrzeits.donationAmount") || "Amount"}</Label>
                <Input
                  type="number"
                  value={form.donation_amount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      donation_amount: e.target.value,
                    }))
                  }
                />
              </div>

              {/* CURRENCY */}
              <div className="space-y-1">
                <Label>{t("common.currency") || "Currency"}</Label>
                <Select
                  value={form.donation_currency}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      donation_currency: v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
             ACTIONS
          ------------------------------------------------------------------- */}
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
