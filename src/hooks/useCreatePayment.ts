// src/hooks/useCreatePayment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

export type CreatePaymentInput = {
  donor_id: string;
  organization_id: string;
  pledge_id?: string | null;
  amount: number;
  method: string;
  notes?: string | null;
  reference_number?: string | null;
  date?: string | null;
};

export function useCreatePayment() {
  const qc = useQueryClient();
  const { organizationId } = useUser();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const {
        donor_id,
        organization_id,
        pledge_id,
        amount,
        method,
        notes,
        reference_number,
        date,
      } = input;

      // -------------------------------
      // 1) Create Payment
      // -------------------------------
      const { data: payment, error: payErr } = await supabase
        .from("payments")
        .insert({
          donor_id,
          organization_id,
          pledge_id: pledge_id ?? null,
          amount,
          method,
          notes: notes ?? null,
          reference_number: reference_number ?? null,
          created_at: date ?? new Date().toISOString(),
        })
        .select("*")
        .single();

      if (payErr) throw payErr;

      // -------------------------------
      // 2) Update pledge totals (if linked)
      // -------------------------------
      if (pledge_id) {
        const { data: pledge, error: pErr } = await supabase
          .from("pledges")
          .select("amount_paid, total_amount")
          .eq("id", pledge_id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!pledge) throw new Error("Pledge not found");

        const newPaid = Number(pledge.amount_paid || 0) + Number(amount);
        const newBalance = Number(pledge.total_amount || 0) - newPaid;

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

    // -------------------------------
    // SUCCESS
    // -------------------------------
    onSuccess: (payment) => {
      toast.success("Payment recorded successfully");

      // כל התשלומים בכל המסכים
      qc.invalidateQueries({ queryKey: ["payments"] });

      // התחייבות ספציפית במסך DonorProfile
      if (payment?.donor_id) {
        qc.invalidateQueries({
          queryKey: ["payments-for-pledges", payment.donor_id, organizationId],
        });

        qc.invalidateQueries({
          queryKey: ["donor-pledges", payment.donor_id, organizationId],
        });
      }

      // מסך Pledges ראשי
      qc.invalidateQueries({ queryKey: ["pledges", organizationId] });
    },

    // -------------------------------
    // ERROR
    // -------------------------------
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment");
    },
  });
}
