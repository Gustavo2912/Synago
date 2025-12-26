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
  const { data: orgSettings } = useOrgSettings();

  const { organizations } = useOrganizations();
  const createYahrzeit = useCreateYahrzeit();
  const createDonation = useCreateDonation();

  // חובה לבחור ארגון כש־ALL + super_admin
  const mustChooseOrgInsideDialog =
    isGlobalSuperAdmin && (!organizationId || organizationId === "all");

  const [selectedOrg, setSelectedOrg] = useState<string>(
    mustChooseOrgInsideDialog ? "" : organizationId || ""
  );

  const donorsQuery = useDonors({
    search: "",
    organizationId: selectedOrg,
  });

  const donors = donorsQuery.data || [];

  const [sameAsDonor, setSameAsDonor] = useState(false);
  const [amount, setAmount] = useState("0"); // סכום תרומה דיפולטי

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

  /* RESET on open */
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
    });

    setAmount("0");
    setSameAsDonor(false);
  }, [open, organizationId, mustChooseOrgInsideDialog]);

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

  const handleSelectDonor = (donorId: string) => {
    setForm((prev) => ({
      ...prev,
      donor_id: donorId,
    }));
  };

  /* SAME AS DONOR autofill */
  useEffect(() => {
    if (!sameAsDonor || !form.donor_id) return;

    const d = donors.find((x: any) => x.id === form.donor_id);
    if (!d) return;

    const displayName =
      d.display_name ||
      `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();

    setForm((prev) => ({
      ...prev,
      contact_name: displayName || "",
      contact_email: d.email || "",
      contact_phone: d.phone || "",
    }));
  }, [sameAsDonor, form.donor_id, donors]);

  /* SUBMIT */
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

    const payload = {
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

    try {
      // 1) Create the Yahrzeit
      const yahrzeit = await createYahrzeit.mutateAsync(payload);

      // 2) Create default donation record (0 amount)
      await createDonation.mutateAsync({
        donor_id: form.donor_id,
        organization_id: finalOrgId,
        amount: Number(amount) || 0,
        currency: orgSettings?.defaultCurrency || "ILS",
        category: "yahrzeit",
        yahrzeit_id: yahrzeit.id,
        date: new Date().toISOString(),
        type: "yahrzeit",
        payment_method: null,
        notes: null,
      });

      onClose();
      toast.success("Yahrzeit created");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error creating yahrzeit");
    }
  };

  /* RENDER */
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("yahrzeits.addTitle") || "Add Yahrzeit"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ORG & DONOR */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("yahrzeits.groupOrgDonor") || "Organization & Donor"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ORG SELECT */}
              {isGlobalSuperAdmin && (
                <div className="space-y-1">
                  <Label>Organization</Label>
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

              {!isGlobalSuperAdmin && (
                <div>
                  <Label>Organization</Label>
                  <div className="border rounded px-3 py-2 bg-muted text-sm">
                    {organizations.find((o: any) => o.id === selectedOrg)?.name ||
                      "-"}
                  </div>
                </div>
              )}

              {/* DONOR */}
              <div className="space-y-1">
                <Label>Donor</Label>
                <Select value={form.donor_id} onValueChange={handleSelectDonor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor" />
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
                onCheckedChange={(c) => setSameAsDonor(!!c)}
              />
              <Label>Contact person is donor</Label>
            </div>
          </div>

          {/* CONTACT */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Contact Information
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Contact Name</Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contact_name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Contact Email</Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contact_email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Contact Phone</Label>
                <Input
                  disabled={sameAsDonor}
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contact_phone: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Yahrzeit Details
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.secular_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, secular_date: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Hebrew Date</Label>
                <Input
                  value={form.hebrew_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hebrew_date: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Deceased</Label>
                <Input
                  value={form.deceased_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, deceased_name: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Relationship</Label>
                <Input
                  value={form.relationship}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, relationship: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Prayer Text</Label>
              <Textarea
                rows={3}
                value={form.prayer_text}
                onChange={(e) =>
                  setForm((p) => ({ ...p, prayer_text: e.target.value }))
                }
              />
            </div>
          </div>

          {/* DONATION SECTION — currency locked */}
          <div className="space-y-3">
            <Label>Donation Amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                disabled
                value={orgSettings?.defaultCurrency || "ILS"}
                className="w-32 bg-muted font-semibold"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
