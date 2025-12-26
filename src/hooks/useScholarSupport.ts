import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScholarSupport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      donor_id: string;
      plan_id: string;
      start_date: string;
      notes?: string;
    }) => {
      const { data: plan, error: planErr } = await supabase
        .from("organization_scholar_plans")
        .select("*")
        .eq("id", payload.plan_id)
        .single();

      if (planErr) throw planErr;

      const amount = Number(plan.amount);

      const { error } = await supabase.from("pledges").insert({
        donor_id: payload.donor_id,
        organization_id: payload.organization_id,
        total_amount: amount,
        amount_paid: 0,
        balance_owed: amount,
        frequency: "monthly",
        status: "active",
        due_date: payload.start_date,
        category: "torah_scholar",
        notes: payload.notes || null,
        currency: "USD", /// later replaced by settings
      });

      if (error) throw error;
      return true;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pledges"] });
    },
  });
}
