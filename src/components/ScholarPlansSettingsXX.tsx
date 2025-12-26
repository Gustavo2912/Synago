import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ScholarPlansSettings() {
  const { t, currency } = useLanguage();
  const { organizationId, isGlobalSuperAdmin } = useUser();

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newPlan, setNewPlan] = useState({
    name: "",
    amount: "",
  });

  const canManage = isGlobalSuperAdmin || true; // תוכל לשלב role אמיתי כאן בהמשך

  useEffect(() => {
    if (!organizationId || organizationId === "all") return;
    loadPlans();
  }, [organizationId]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("organization_scholar_plans")
      .select("*")
      .eq("organization_id", organizationId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPlans(data || []);
  };

  const handleAdd = async () => {
    if (!newPlan.name.trim() || !newPlan.amount) {
      toast.error("Please enter plan name + amount");
      return;
    }

    const { error } = await supabase
      .from("organization_scholar_plans")
      .insert({
        organization_id: organizationId,
        name: newPlan.name,
        amount: Number(newPlan.amount),
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewPlan({ name: "", amount: "" });
    loadPlans();
    toast.success("Plan added");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("organization_scholar_plans")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    loadPlans();
    toast.success("Plan removed");
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Scholar Support Plans</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Existing plans */}
        <div className="space-y-4">
          {plans.length === 0 && (
            <div className="text-muted-foreground">No plans defined.</div>
          )}

          {plans.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center border p-3 rounded-md"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {currency} {Number(p.amount).toLocaleString()}
                </div>
              </div>

              {canManage && (
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(p.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add new plan */}
        {canManage && (
          <div className="space-y-3 border-t pt-4">
            <Label>New Plan</Label>

            <Input
              placeholder="Plan name"
              value={newPlan.name}
              onChange={(e) =>
                setNewPlan((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            <Input
              type="number"
              placeholder="Amount per month"
              value={newPlan.amount}
              onChange={(e) =>
                setNewPlan((prev) => ({ ...prev, amount: e.target.value }))
              }
            />

            <Button onClick={handleAdd}>Add Plan</Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
