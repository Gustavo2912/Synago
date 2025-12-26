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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useUser } from "@/contexts/UserContext";
import { useDonors } from "@/hooks/useDonors";
import { useScholarPlans } from "@/hooks/useScholarPlans";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AddScholarSupportDialog({ open, onClose }) {
  const { organizationId } = useUser();

  const { data: donors = [] } = useDonors({
    search: "",
    organizationId,
  });

  const { data: plans = [] } = useScholarPlans(organizationId);

  const defaultPlans = [
    { name: "Basic Support", amount: 180 },
    { name: "Standard Support", amount: 360 },
    { name: "Enhanced Support", amount: 540 },
    { name: "Premium Support", amount: 900 },
    { name: "Full Support", amount: 1800 },
  ];

  const activePlans = plans.length > 0 ? plans : defaultPlans;

  const [form, setForm] = useState({
    donor_id: "",
    plan_key: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({ donor_id: "", plan_key: "", notes: "" });
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.donor_id || !form.plan_key) {
      toast.error("Please choose donor and plan.");
      return;
    }

    const selected = activePlans.find((p) => p.id === form.plan_key || p.amount === Number(form.plan_key));

    if (!selected) {
      toast.error("Invalid plan selected");
      return;
    }

    const { error } = await supabase.from("pledges").insert({
      donor_id: form.donor_id,
      organization_id: organizationId,
      total_amount: selected.amount,
      amount_paid: 0,
      balance_owed: selected.amount,
      frequency: "monthly",
      category: "torah_scholar",
      status: "active",
      notes: form.notes || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Support added");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Torah Scholar Support</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* DONOR */}
          <div>
            <Label>Donor</Label>
            <Select
              value={form.donor_id}
              onValueChange={(v) => setForm({ ...form, donor_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select donor" />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.display_name || `${d.first_name} ${d.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PLAN */}
          <div>
            <Label>Support Plan</Label>
            <Select
              value={form.plan_key}
              onValueChange={(v) => setForm({ ...form, plan_key: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((p) => (
                  <SelectItem
                    key={p.id || p.amount}
                    value={p.id || p.amount.toString()}
                  >
                    {p.name} — {p.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NOTES */}
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Special instructions..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
