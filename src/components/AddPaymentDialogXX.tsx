// src/components/AddPaymentDialog.tsx
import { useEffect, useState, useMemo } from "react";
import { useCreatePayment } from "@/hooks/usePayments";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  pledgeId: string | null;
  donorId: string | null;
  organizationId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function AddPaymentDialog({
  pledgeId,
  donorId,
  organizationId,
  open,
  onClose,
}: Props) {
  // ================================
  // State
  // ================================
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [method, setMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createPayment = useCreatePayment();
  const loading = createPayment.isPending;

  // ================================
  // Fetch currency for this organization
  // ================================
  const { data: settings } = useQuery({
    queryKey: ["org-settings-for-payment", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("default_currency")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  const currency = settings?.default_currency || "USD";

  // ================================
  // Reset when dialog reopens
  // ================================
  useEffect(() => {
    if (open) {
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod("Cash");
      setReferenceNumber("");
      setNotes("");
    }
  }, [open]);

  // ================================
  // Missing IDs → Loading popup
  // ================================
  if (!pledgeId || !donorId || !organizationId) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // ================================
  // Save payment
  // ================================
  const savePayment = async () => {
    const num = Number(amount);

    if (!num || isNaN(num) || num <= 0) {
      alert("Invalid amount");
      return;
    }

    try {
      await createPayment.mutateAsync({
        pledge_id: pledgeId,
        donor_id: donorId,
        organization_id: organizationId,
        amount: num,
        currency,
        date,
        method,
        reference_number: referenceNumber || null,
        notes: notes || null,
        status: "succeeded",
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save payment\n" + err.message);
    }
  };

  // ================================
  // Render
  // ================================
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* AMOUNT */}
          <div>
            <div className="text-xs mb-1">Amount ({currency})</div>
            <Input
              type="number"
              placeholder={`0.00`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* DATE */}
          <div>
            <div className="text-xs mb-1">Date</div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* METHOD */}
          <div>
            <div className="text-xs mb-1">Method</div>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Transfer">Transfer</option>
              <option value="CreditCard">Credit Card</option>
              <option value="Zelle">Zelle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* REFERENCE */}
          <div>
            <div className="text-xs mb-1">Reference Number</div>
            <Input
              placeholder="Optional"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* NOTES */}
          <div>
            <div className="text-xs mb-1">Notes</div>
            <Textarea
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={savePayment} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
