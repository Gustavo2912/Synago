import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateDonor } from "@/hooks/useDonors";

export default function AddDonorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createDonor = useCreateDonor();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    notes: "",
  });

  const update = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    await createDonor.mutateAsync(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Donor</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto p-1">

          <Input
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />

          <Input
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />

          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />

          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />

          <Input
            placeholder="Address line 1"
            value={form.address_line1}
            onChange={(e) => update("address_line1", e.target.value)}
          />

          <Input
            placeholder="Address line 2"
            value={form.address_line2}
            onChange={(e) => update("address_line2", e.target.value)}
          />

          <Input
            placeholder="City"
            value={form.address_city}
            onChange={(e) => update("address_city", e.target.value)}
          />

          <Input
            placeholder="State"
            value={form.address_state}
            onChange={(e) => update("address_state", e.target.value)}
          />

          <Input
            placeholder="ZIP"
            value={form.address_zip}
            onChange={(e) => update("address_zip", e.target.value)}
          />

          <textarea
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={handleSave} disabled={createDonor.isLoading}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
