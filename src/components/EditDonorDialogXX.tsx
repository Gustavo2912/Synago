// src/components/EditDonorDialog.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  donor: any;
  open: boolean;
  onClose: () => void;
};

export default function EditDonorDialog({ donor, open, onClose }: Props) {
  const qc = useQueryClient();

  // Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  // -------------------------------
  // Load ALL organizations
  // -------------------------------
  const { data: organizations = [] } = useQuery({
    queryKey: ["all-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // -------------------------------
  // Load donor → organizations
  // -------------------------------
  const { data: donorOrgs = [] } = useQuery({
    queryKey: ["donor-organizations", donor?.id],
    enabled: !!donor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_organizations") // ← ← ← FIXED TABLE NAME
        .select("organization_id")
        .eq("donor_id", donor.id);

      if (error) throw error;
      return data || [];
    },
  });

  // -------------------------------
  // Fill initial values
  // -------------------------------
  useEffect(() => {
    if (!donor || !open) return;

    setFirstName(donor.first_name || "");
    setLastName(donor.last_name || "");
    setDisplayName(donor.display_name || "");
    setEmail(donor.email || "");
    setPhone(donor.phone || "");

    setAddressStreet(donor.address_street || "");
    setAddressCity(donor.address_city || "");
    setAddressState(donor.address_state || "");
    setAddressZip(donor.address_zip || "");
    setAddressCountry(donor.address_country || "");

    setNotes(donor.notes || "");

    setSelectedOrgs(donorOrgs.map((o: any) => o.organization_id));
  }, [donor, donorOrgs, open]);

  // -------------------------------
  // Save DONOR
  // -------------------------------
  const updateDonor = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase
        .from("donors")
        .update(input)
        .eq("id", donor.id);

      if (error) throw error;
    },
  });

  // -------------------------------
  // Save donor_organizations
  // -------------------------------
  const updateOrgs = useMutation({
    mutationFn: async (orgIds: string[]) => {
      // Remove old
      await supabase
        .from("donor_organizations") // ← FIXED NAME
        .delete()
        .eq("donor_id", donor.id);

      // Insert new
      if (orgIds.length > 0) {
        const rows = orgIds.map((id) => ({
          donor_id: donor.id,
          organization_id: id,
        }));

        const { error } = await supabase
          .from("donor_organizations")
          .insert(rows);

        if (error) throw error;
      }
    },
  });

  const saveAll = async () => {
    try {
      await updateDonor.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        phone,
        email,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        address_country: addressCountry,
        notes,
      });

      await updateOrgs.mutateAsync(selectedOrgs);

      qc.invalidateQueries();
      onClose();
    } catch (e: any) {
      alert("Error saving donor: " + e.message);
    }
  };

  const toggleOrg = (id: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  if (!donor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Donor – {displayName || firstName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

          {/* LEFT SIDE */}
          <div className="space-y-3">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label>Notes</label>
            <textarea
              className="border rounded-md w-full px-2 py-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-3">
            <Input placeholder="Street" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
            <Input placeholder="City" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
            <Input placeholder="State" value={addressState} onChange={(e) => setAddressState(e.target.value)} />
            <Input placeholder="ZIP" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} />
            <Input placeholder="Country" value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} />

            <div className="pt-3">
              <b>Organizations</b>
              <div className="space-y-1 pt-1">
                {organizations.map((o: any) => (
                  <div key={o.id} className="flex gap-2 items-center">
                    <Checkbox
                      checked={selectedOrgs.includes(o.id)}
                      onCheckedChange={() => toggleOrg(o.id)}
                    />
                    <span>{o.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={saveAll}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
