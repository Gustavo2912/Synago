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

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  if (!organizationId || organizationId === "all") {
    return (
      <div className="text-center text-muted-foreground p-6">
        Select a specific organization to manage scholar plans.
      </div>
    );
  }

  const currency = settings?.defaultCurrency || "ILS";

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

    if (error) toast.error(error.message);
    else {
      toast.success("Plan added");
      setNewName("");
      setNewAmount("");
      refetch();
    }
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scholar Plans</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add Plan */}
        <div className="space-y-3">
          <Input
            placeholder="Plan Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Input
            type="number"
            placeholder={`Amount in ${currency}`}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
          />

          <Button onClick={handleAdd}>Add Plan</Button>
        </div>

        {/* Existing Plans */}
        <div className="border-t pt-4 space-y-3">
          {plans?.map((p: any) => (
            <div
              key={p.id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.amount} {currency}
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => handleDelete(p.id)}
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
