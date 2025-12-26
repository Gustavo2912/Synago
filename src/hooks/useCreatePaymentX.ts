import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      // 1) יצירת רשומת תשלום
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

      // 2) אם משויך ל־pledge → עדכון סכומים ב־pledges
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

    onSuccess: (_payment, vars) => {
      toast.success("Payment recorded successfully");

      // ריענון מסך ההתחייבויות הראשי
      qc.invalidateQueries({ queryKey: ["all-pledges"] });
      // ריענון התחייבויות של תורם ספציפי במסך התורם
      qc.invalidateQueries({ queryKey: ["donor-pledges"] });
      // ריענון כל התשלומים במסך Payments
      qc.invalidateQueries({ queryKey: ["payments"] });
    },

    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment");
    },
  });
}
