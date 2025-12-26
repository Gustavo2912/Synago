import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreatePledge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("pledges")
        .insert({
          donor_id: input.donor_id,
          organization_id: input.organization_id,
          total_amount: input.total_amount,
          amount_paid: input.amount_paid,
          balance_owed: input.balance_owed,
          due_date: input.due_date,
          frequency: input.frequency,
          status: input.status,
          notes: input.notes,
          campaign_id: input.campaign_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["pledges"] });
      qc.invalidateQueries({ queryKey: ["donor-pledges", vars.donor_id] });
    },
  });
}
