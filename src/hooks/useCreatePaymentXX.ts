// src/hooks/useCreatePayment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CreatePaymentInput = {
  donor_id: string;
  pledge_id?: string | null;
  organization_id: string;
  amount: number;
  method: string;
  notes?: string | null;
  reference_number?: string | null;
  date?: string | null;
};

export function useCreatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const {
        donor_id,
        pledge_id,
        organization_id,
        amount,
        method,
        notes,
        reference_number,
        date,
      } = input;

      // 1) Insert payment
      const { data: payment, error: payErr } = await supabase
        .from("payments")
        .insert({
          donor_id,
          organization_id,
          amount,
          method,
          notes,
          reference_number,
          created_at: date ?? new Date().toISOString(),
          pledge_id: pledge_id ?? null,
        })
        .select()
        .single();

      if (payErr) throw payErr;

      // 2) If connected to pledge → update pledge totals
      if (pledge_id) {
        const { data: pledge, error: pErr } = await supabase
          .from("pledges")
          .select("amount_paid, total_amount")
          .eq("id", pledge_id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!pledge) throw new Error("Pledge not found");

        const newPaid = Number(pledge.amount_paid || 0) + Number(amount);
        const newBalance = Number(pledge.total_amount) - newPaid;

        const { error: updErr } = await supabase
          .from("pledges")
          .update({
            amount_paid: newPaid,
            balance_owed: newBalance,
            status: newBalance <= 0 ? "completed" : "active",
          })
          .eq("id", pledge_id);

        if (updErr) throw updErr;
      }

      return payment;
    },

    onSuccess: (_, vars) => {
      toast.success("Payment recorded successfully");

      // Global refresh
      qc.invalidateQueries({ queryKey: ["pledges"] });

      if (vars.pledge_id) {
        qc.invalidateQueries({ queryKey: ["donor-pledges", vars.donor_id] });
        qc.invalidateQueries({ queryKey: ["pledge-payments", vars.pledge_id] });
        qc.invalidateQueries({ queryKey: ["donor-pledges-payments", vars.pledge_id] });
      }

      qc.invalidateQueries({ queryKey: ["donor-donations", vars.donor_id] });
    },

    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment");
    },
  });
}
