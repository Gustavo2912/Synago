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
import { useOrganizations } from "@/hooks/useOrganizations";
import { useScholarPlans } from "@/hooks/useScholarPlans";
import { useScholarSupport } from "@/hooks/useScholarSupport";

import { toast } from "sonner";

export default function AddScholarSupportDialog({ open, onClose }) {
  const { isGlobalSuperAdmin, organizationId, setOrganizationId } = useUser();

  const mustChooseOrg = isGlobalSuperAdmin && organizationId === "all";

  const [selectedOrg, setSelectedOrg] = useState(
    mustChooseOrg ? "" : organizationId
  );

  const { organizations } = useOrganizations();

  const donorsQuery = useDonors({
    organizationId: selectedOrg,
    search: "",
  });

  const donors = donorsQuery.data || [];

  const plansQuery = useScholarPlans(selectedOrg);
  const plans = plansQuery.data || [];

  const createSupport = useScholarSupport();

  const [form, setForm] = useState({
    donor_id: "",
    plan_id: "",
    start_date: "",
    notes: "",
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;

    setSelectedOrg(mustChooseOrg ? "" : organizationId);

    setForm({
      donor_id: "",
      plan_id: "",
      start_date: "",
      notes: "",
    });
  }, [open, organizationId, mustChooseOrg]);

  // handle selecting org
  const handleSelectOrg = (id) => {
    setSelectedOrg(id);
    setOrganizationId(id);

    setForm({
      ...form,
      donor_id: "",
      plan_id: "",
    });
  };

  const handleSubmit = async () => {
    if (mustChooseOrg && !selectedOrg) {
      toast.error("Please select organization");
      return;
    }

    const org = selectedOrg || organizationId;

    if (!form.donor_id) {
      toast.error("Please select donor");
      return;
    }

    if (!form.plan_id) {
      toast.error("Please select plan");
      return;
    }

    if (!form.start_date) {
      toast.error("Please enter start date");
      return;
    }

    try {
      await createSupport.mutateAsync({
        organization_id: org,
        donor_id: form.donor_id,
        plan_id: form.plan_id,
        start_date: form.start_date,
        notes: form.notes || null,
      });

      toast.success("Scholar support added");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Torah Scholar Support</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">

          {/* ORG SELECT */}
          {isGlobalSuperAdmin && (
            <div className="space-y-1">
              <Label>Organization</Label>
              <Select value={selectedOrg} onValueChange={handleSelectOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* DONOR SELECT */}
          <div className="space-y-1">
            <Label>Donor</Label>
            <Select
              disabled={!selectedOrg}
              value={form.donor_id}
              onValueChange={(v) => setForm({ ...form, donor_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select donor" />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.display_name ||
                      `${d.first_name || ""} ${d.last_name || ""}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PLAN SELECT */}
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select
              disabled={!selectedOrg}
              value={form.plan_id}
              onValueChange={(v) => setForm({ ...form, plan_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.length === 0 && (
                  <div className="text-muted-foreground p-2">
                    No plans defined.
                  </div>
                )}

                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.amount} / month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* START DATE */}
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
            />
          </div>

          {/* NOTES */}
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createSupport.isLoading}>
              {createSupport.isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
