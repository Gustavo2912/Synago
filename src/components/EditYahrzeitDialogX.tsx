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

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { useOrganizations } from "@/hooks/useOrganizations";
import { useDonors } from "@/hooks/useDonors";

import { useUpdateYahrzeit, useDeleteYahrzeit } from "@/hooks/useYahrzeits";
import { useUpsertYahrzeitDonation } from "@/hooks/useDonations";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EditYahrzeitDialog({ open, onClose, yahrzeit }: any) {
  const { t, currency: defaultCurrency } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const { organizations } = useOrganizations();
  const updateYahrzeit = useUpdateYahrzeit();
  const deleteYahrzeit = useDeleteYahrzeit();
  const upsertDonation = useUpsertYahrzeitDonation();

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [sameAsDonor, setSameAsDonor] = useState(false);

  const donorsQuery = useDonors({
    search: "",
    organizationId: selectedOrg,
  });
  const donors = donorsQuery.data || [];

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

  const [donationId, setDonationId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState("0");
  const [donationCurrency, setDonationCurrency] = useState("USD");

  const mustChooseOrg = isGlobalSuperAdmin && (organizationId === "all" || !organizationId);

  /* ---------------- LOAD INITIAL ---------------- */
  useEffect(() => {
    if (!open || !yahrzeit) return;

    const orgId = mustChooseOrg ? yahrzeit.organization_id : organizationId || yahrzeit.organization_id;
    setSelectedOrg(orgId);

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

    if (yahrzeit.contact_email === yahrzeit.donor_email) {
      setSameAsDonor(true);
    } else {
      setSameAsDonor(false);
    }

    (async () => {
      const { data } = await supabase
        .from("donations")
        .select("*")
        .eq("category", "yahrzeit")
        .eq("yahrzeit_id", yahrzeit.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setDonationId(data.id);
        setDonationAmount(String(data.amount));
        setDonationCurrency(data.currency || defaultCurrency);
      } else {
        setDonationId(null);
        setDonationAmount("0");
        setDonationCurrency(defaultCurrency);
      }
    })();
  }, [open, yahrzeit]);

  /* ---------------- SAME AS DONOR ---------------- */
  useEffect(() => {
    if (!sameAsDonor || !form.donor_id) return;

    const donor = donors.find((d: any) => d.id === form.donor_id);
    if (!donor) return;

    const name = donor.display_name || `${donor.first_name ?? ""} ${donor.last_name ?? ""}`.trim();

    setForm((f) => ({
      ...f,
      contact_name: name,
      contact_email: donor.email || "",
      contact_phone: donor.phone || "",
    }));
  }, [sameAsDonor, form.donor_id]);

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!form.donor_id) return toast.error("Please select donor");
    if (!form.deceased_name.trim()) return toast.error("Missing name");
    if (!form.secular_date) return toast.error("Missing date");

    const finalOrg =
      selectedOrg || (!mustChooseOrg ? organizationId : null) || yahrzeit.organization_id;

    const amountNum = Number(donationAmount);
    if (isNaN(amountNum) || amountNum < 0) return toast.error("Invalid amount");

    try {
      await updateYahrzeit.mutateAsync({
        id: yahrzeit.id,
        donor_id: form.donor_id,
        organization_id: finalOrg,
        deceased_name: form.deceased_name,
        relationship: form.relationship,
        secular_date: form.secular_date,
        hebrew_date: form.hebrew_date,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        prayer_text: form.prayer_text,
        reminder_enabled: form.reminder_enabled,
      });

      await upsertDonation.mutateAsync({
        id: donationId || undefined,
        yahrzeitId: yahrzeit.id,
        donorId: form.donor_id,
        organizationId: finalOrg,
        amount: amountNum,
        currency: donationCurrency,
      });

      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async () => {
    if (!confirm("Delete?")) return;

    await deleteYahrzeit.mutateAsync(yahrzeit.id);
    onClose();
  };

  if (!yahrzeit) return null;

  /* ---------------- RENDER ---------------- */
  const selectedDonor = donors.find((d: any) => d.id === form.donor_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Yahrzeit</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* ORG + DONOR */}
          <div className="space-y-4">
            <Label className="text-xs font-semibold text-muted-foreground">
              Organization & Donor
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ORG */}
              <div>
                <Label>Organization</Label>
                {isGlobalSuperAdmin ? (
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {organizations.map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="border rounded px-3 py-2 bg-muted text-sm">
                    {organizations.find((o: any) => o.id === yahrzeit.organization_id)?.name}
                  </div>
                )}
              </div>

              {/* DONOR */}
              <div>
                <Label>Donor</Label>
                <Select value={form.donor_id} onValueChange={(v) => setForm((f)=>({...f, donor_id:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select donor" /></SelectTrigger>
                  <SelectContent>
                    {donors.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.display_name || `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DONOR DETAILS */}
            {selectedDonor && (
              <div className="p-3 border rounded bg-slate-50 text-xs space-y-1">
                <div><strong>Name:</strong> {selectedDonor.display_name || `${selectedDonor.first_name} ${selectedDonor.last_name}`}</div>
                <div><strong>Email:</strong> {selectedDonor.email}</div>
                <div><strong>Phone:</strong> {selectedDonor.phone}</div>
              </div>
            )}

            {/* SAME AS DONOR */}
            <div className="flex items-center gap-2">
              <Checkbox checked={sameAsDonor} onCheckedChange={(v)=>setSameAsDonor(Boolean(v))}/>
              <Label>Contact is donor</Label>
            </div>
          </div>

          {/* CONTACT */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground">Contact</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label>Contact name</Label>
                <Input disabled={sameAsDonor} value={form.contact_name}
                       onChange={(e)=>setForm({...form, contact_name:e.target.value})}/>
              </div>

              <div>
                <Label>Contact email</Label>
                <Input disabled={sameAsDonor} value={form.contact_email}
                       onChange={(e)=>setForm({...form, contact_email:e.target.value})}/>
              </div>

              <div>
                <Label>Contact phone</Label>
                <Input disabled={sameAsDonor} value={form.contact_phone}
                       onChange={(e)=>setForm({...form, contact_phone:e.target.value})}/>
              </div>

            </div>
          </div>

          {/* DETAILS */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground">Details</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <Label>Secular date</Label>
                <Input type="date" value={form.secular_date}
                       onChange={(e)=>setForm({...form, secular_date:e.target.value})}/>
              </div>

              <div>
                <Label>Hebrew date</Label>
                <Input value={form.hebrew_date}
                       onChange={(e)=>setForm({...form, hebrew_date:e.target.value})}/>
              </div>

              <div>
                <Label>Deceased name</Label>
                <Input value={form.deceased_name}
                       onChange={(e)=>setForm({...form, deceased_name:e.target.value})}/>
              </div>

              <div>
                <Label>Relationship</Label>
                <Input value={form.relationship}
                       onChange={(e)=>setForm({...form, relationship:e.target.value})}/>
              </div>

            </div>

            <div>
              <Label>Prayer text</Label>
              <Textarea rows={3} value={form.prayer_text}
                        onChange={(e)=>setForm({...form, prayer_text:e.target.value})}/>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={form.reminder_enabled}
                        onCheckedChange={(v)=>setForm({...form, reminder_enabled:Boolean(v)})}/>
              <Label>Send yearly reminder email</Label>
            </div>
          </div>

          {/* DONATION */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Yahrzeit Donation
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <Label>Amount</Label>
                <Input type="number" value={donationAmount}
                       onChange={(e)=>setDonationAmount(e.target.value)}/>
              </div>

              <div>
                <Label>Currency</Label>
                <Select value={donationCurrency} onValueChange={setDonationCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="ILS">ILS (₪)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

          {/* ACTIONS */}
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogFooter>

        </div>

      </DialogContent>
    </Dialog>
  );
}
