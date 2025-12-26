import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { useCreatePayment } from "@/hooks/useCreatePayment";

type Props = {
  open: boolean;
  onClose: () => void;
  pledge?: any | null;
  donor: any | null;
};

export default function RecordPaymentDialog({ open, onClose, pledge, donor }: Props) {
  const { t, currencySymbol } = useLanguage();
  const { organizationId } = useUser();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createPayment = useCreatePayment();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setMethod("Cash");
      setReferenceNumber("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!donor || !organizationId) return;
    if (!amount || Number(amount) <= 0) return;

    await createPayment.mutateAsync({
      donor_id: donor.id,
      organization_id: organizationId,
      pledge_id: pledge?.id ?? null,
      amount: Number(amount),
      method,
      notes,
      reference_number: referenceNumber,
      date: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("payments.record") || "Record Payment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Amount */}
          <div className="space-y-1">
            <Label>{t("payments.amount") || "Amount"}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${currencySymbol}0`}
            />
          </div>

          {/* Method */}
          <div className="space-y-1">
            <Label>{t("payments.method") || "Payment Method"}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference number */}
          <div className="space-y-1">
            <Label>{t("payments.reference") || "Reference Number"}</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>{t("payments.notes") || "Notes"}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
