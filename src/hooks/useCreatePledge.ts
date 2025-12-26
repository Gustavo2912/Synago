// src/hooks/useCreatePledge.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

export function useCreatePledge() {
  const qc = useQueryClient();
  const { organizationId } = useUser();

  return useMutation({
    mutationFn: async (input: any) => {
      const {
        donor_id,
        total_amount,
        amount_paid = 0,
        due_date,
        frequency,
        notes,
        campaign_id = null,
      } = input;

      if (!organizationId || organizationId === "all") {
        throw new Error("Cannot create a pledge without selecting an organization");
      }

      const balance_owed = Number(total_amount) - Number(amount_paid);

      const { data, error } = await supabase
        .from("pledges")
        .insert({
          donor_id,
          organization_id: organizationId,
          total_amount,
          amount_paid,
          balance_owed,
          due_date,
          frequency,
          notes: notes ?? null,
          status: balance_owed <= 0 ? "completed" : "active",
          campaign_id,
        })
        .select("*")
        .single();

      if (error) throw error;

      return data;
    },

    onSuccess: (pledge) => {
      toast.success("Pledge created successfully");

      // מסך התחייבויות ראשי
      qc.invalidateQueries({ queryKey: ["pledges", organizationId] });

      // מסכי תורם
      if (pledge?.donor_id) {
        qc.invalidateQueries({
          queryKey: ["donor-pledges", pledge.donor_id, organizationId],
        });

        qc.invalidateQueries({
          queryKey: ["payments-for-pledges", pledge.donor_id, organizationId],
        });
      }
    },

    onError: (err: any) => {
      toast.error(err?.message || "Failed to create pledge");
    },
  });
}
