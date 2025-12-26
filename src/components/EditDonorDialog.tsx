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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");

  const [notes, setNotes] = useState("");

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
  // FILL FORM WHEN OPEN
  // ---------------------------
  useEffect(() => {
    if (!donor || !open) return;

    setFirstName(donor.first_name || "");
    setLastName(donor.last_name || "");
    setDisplayName(donor.display_name || "");
    setPhone(donor.phone || "");
    setEmail(donor.email || "");

    setAddressStreet(donor.address_street || "");
    setAddressCity(donor.address_city || "");
    setAddressState(donor.address_state || "");
    setAddressZip(donor.address_zip || "");
    setAddressCountry(donor.address_country || "");

    setNotes(donor.notes || "");

    // Selected organizations
    setSelectedOrgIds(donorOrgRows.map((x) => x.organization_id));
  }, [donor, donorOrgRows, open]);

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
      // Update donor fields
      const { error: updErr } = await supabase
        .from("donors")
        .update({
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          email,
          phone,
          address_street: addressStreet,
          address_city: addressCity,
          address_state: addressState,
          address_zip: addressZip,
          address_country: addressCountry,
          notes,
        })
        .eq("id", donor.id);

      if (updErr) throw updErr;

      // Update donor_organizations (fixed)
      await replaceDonorOrganizations(donor.id, selectedOrgIds);

      // Refresh UI everywhere
      queryClient.invalidateQueries(["donors"]);
      queryClient.invalidateQueries(["donor-organizations"]);
      queryClient.invalidateQueries(["donor-profile", donor.id]);

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

          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />

          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />

          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />

          <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Street" />
          <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" />
          <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
          <Input value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="ZIP" />
          <Input value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} placeholder="Country" />

        </div>

        <div className="mt-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
