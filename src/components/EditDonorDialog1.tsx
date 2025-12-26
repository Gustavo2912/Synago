// src/components/EditDonorDialog.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditDonorDialog({ donor, open, onClose }) {
  const queryClient = useQueryClient();

  // ---------------------------
  // LOCAL STATE
  // ---------------------------
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    phone: "",
    email: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "",
    notes: "",
  });

  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  // ---------------------------
  // LOAD ORGANIZATIONS
  // ---------------------------
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name");

      if (error) throw error;
      return data;
    },
  });

  // ---------------------------
  // LOAD DONOR ORGANIZATIONS
  // ---------------------------
  const { data: donorOrgRows = [] } = useQuery({
    queryKey: ["donor-organizations", donor?.id],
    enabled: !!donor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_organizations")
        .select("organization_id")
        .eq("donor_id", donor.id);

      if (error) throw error;
      return data;
    },
  });

  // ---------------------------
  // FILL DONOR FIELD VALUES
  // ---------------------------
  useEffect(() => {
    if (donor && open) {
      setForm({
        first_name: donor.first_name || "",
        last_name: donor.last_name || "",
        display_name: donor.display_name || "",
        phone: donor.phone || "",
        email: donor.email || "",
        address_street: donor.address_street || "",
        address_city: donor.address_city || "",
        address_state: donor.address_state || "",
        address_zip: donor.address_zip || "",
        address_country: donor.address_country || "",
        notes: donor.notes || "",
      });
    }
  }, [donor, open]);

  // ---------------------------
  // FILL ORGANIZATION SELECTION
  // ---------------------------
  useEffect(() => {
    if (donorOrgRows && open) {
      setSelectedOrgIds(donorOrgRows.map((x) => x.organization_id));
    }
  }, [donorOrgRows, open]);

  // ============================================================
  //  REPLACE DONOR ORGANIZATIONS  (delete → reinsert)
  // ============================================================
  async function replaceDonorOrganizations(donorId: string, orgIds: string[]) {
    // delete existing rows
    const { error: delErr } = await supabase
      .from("donor_organizations")
      .delete()
      .eq("donor_id", donorId);

    if (delErr) throw delErr;

    if (orgIds.length === 0) return;

    const rows = orgIds.map((orgId) => ({
      donor_id: donorId,
      organization_id: orgId,
    }));

    const { error: insertErr } = await supabase
      .from("donor_organizations")
      .insert(rows);

    if (insertErr) throw insertErr;
  }

  // ============================================================
  // SAVE DONOR
  // ============================================================
  async function handleSave() {
    if (!donor) return;

    try {
      const { error: updErr } = await supabase
        .from("donors")
        .update(form)
        .eq("id", donor.id);

      if (updErr) throw updErr;

      await replaceDonorOrganizations(donor.id, selectedOrgIds);

      //  REFRESH UI
      queryClient.invalidateQueries(["donors"]);
      queryClient.invalidateQueries(["donor-organizations"]);
      queryClient.invalidateQueries(["donations"]);
      queryClient.invalidateQueries(["pledges"]);
      queryClient.invalidateQueries(["payments-for-pledges"]);

      onClose();
    } catch (err: any) {
      alert("Error saving donor: " + err.message);
    }
  }

  // ---------------------------
  // TOGGLE ORG
  // ---------------------------
  function toggleOrg(orgId: string) {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  }

  if (!open) return null;

  // ============================================================
  //  UI
  // ============================================================
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Donor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First Name" />
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last Name" />

          <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Display Name" />
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />

          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />

          <Input value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} placeholder="Street" />
          <Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} placeholder="City" />
          <Input value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} placeholder="State" />
          <Input value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} placeholder="ZIP" />
          <Input value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} placeholder="Country" />
        </div>

        <div className="mt-4">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>

        {/* ORGANIZATIONS */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Organizations</h3>

          <div className="space-y-2">
            {organizations.map((org) => (
              <label key={org.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedOrgIds.includes(org.id)}
                  onCheckedChange={() => toggleOrg(org.id)}
                />
                {org.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
