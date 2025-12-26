import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PledgeWithDonor } from "@/hooks/usePledges";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  payment_method: z.string().min(1, "Payment method is required"),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PledgePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pledge: PledgeWithDonor;
}

export function PledgePaymentDialog({ open, onOpenChange, pledge }: PledgePaymentDialogProps) {
  const { t, currencySymbol } = useLanguage();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      payment_method: "",
      notes: "",
    },
  });

  const createPayment = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const { data: donation, error } = await supabase
        .from("donations")
        .insert([{
          donor_id: pledge.donor_id,
          pledge_id: pledge.id,
          amount: parseFloat(data.amount),
          payment_method: data.payment_method as "Cash" | "Check" | "CreditCard" | "Other" | "Transfer" | "Zelle",
          notes: data.notes || null,
          type: "Regular",
          status: "Succeeded",
        }])
        .select()
        .single();

      if (error) throw error;
      return donation;
    },
    onSuccess: async (donation) => {
      queryClient.invalidateQueries({ queryKey: ["pledges"] });
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast.success("Payment recorded successfully");
      
      // Check if pledge is now completed and send thank you email
      const newAmountPaid = pledge.amount_paid + donation.amount;
      if (newAmountPaid >= pledge.total_amount) {
        try {
          await supabase.functions.invoke("send-pledge-completion-email", {
            body: { pledgeId: pledge.id },
          });
          toast.success("Thank you email sent to donor");
        } catch (error) {
          console.error("Failed to send completion email:", error);
        }
      }
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsPending(true);
    try {
      await createPayment.mutateAsync(data);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Donor:</span>
              <span className="font-medium">{pledge.donor.display_name || `${pledge.donor.first_name} ${pledge.donor.last_name}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pledge:</span>
              <span className="font-medium">{currencySymbol}{pledge.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">{currencySymbol}{pledge.amount_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Owed:</span>
              <span className="font-semibold text-primary">{currencySymbol}{pledge.balance_owed.toFixed(2)}</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="CreditCard">Credit Card</SelectItem>
                        <SelectItem value="Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Zelle">Zelle</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this payment"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Record Payment
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
