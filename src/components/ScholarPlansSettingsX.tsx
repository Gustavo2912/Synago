// src/components/ScholarPlansSettings.tsx

import { useState } from "react";
import { useScholarPlans } from "@/hooks/useScholarPlans";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { useUser } from "@/contexts/UserContext";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScholarPlansSettings() {
  const { organizationId } = useUser();
  const { data: settings } = useOrgSettings();
  const { data: plans, refetch } = useScholarPlans(organizationId);

  const [newAmount, setNewAmount] = useState("");
  const [newName, setNewName] = useState("");

  if (!organizationId || organizationId === "all") {
    return (
      <div className="text-center text-muted-foreground p-6">
        Select a specific organization to manage scholar plans.
      </div>
    );
  }

  const currency = settings?.defaultCurrency || "ILS";

  /* -----------------------------------------
     ADD NEW PLAN
  ----------------------------------------- */
  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Name is required");
    if (!newAmount) return toast.error("Amount is required");

    const payload = {
      organization_id: organizationId,
      name: newName.trim(),
      amount: Number(newAmount),
    };

    const { error } = await supabase
      .from("organization_scholar_plans")
      .insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Scholar plan added");
      refetch();
      setNewAmount("");
      setNewName("");
    }
  };

  /* -----------------------------------------
     DELETE PLAN
  ----------------------------------------- */
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("organization_scholar_plans")
      .delete()
      .eq("id", id);

    if (error) toast.error(error.message);
    else {
      toast.success("Plan deleted");
      refetch();
    }
  };

  /* -----------------------------------------
     RENDER UI
  ----------------------------------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scholar Plans</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ADD NEW PLAN */}
        <div className="flex flex-col gap-3">

          <div>
            <label className="text-sm font-medium">Plan Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Monthly Support"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Amount ({currency})</label>
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder={`Amount in ${currency}`}
            />
          </div>

          <Button className="w-min" onClick={handleAdd}>
            Add Plan
          </Button>
        </div>

        {/* LIST OF PLANS */}
        <div className="border-t pt-4 space-y-3">
          {plans?.length === 0 && (
            <div className="text-muted-foreground">
              No plans created yet.
            </div>
          )}

          {plans?.map((plan: any) => (
            <div
              key={plan.id}
              className="flex justify-between items-center border p-3 rounded-md"
            >
              <div>
                <div className="font-semibold">{plan.name}</div>

                <div className="text-sm text-muted-foreground">
                  {plan.amount} {currency}
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => handleDelete(plan.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
