import { usePaymentsByPledge } from "./usePayments";

export function usePledgeComputedTotals(pledge: any) {
  const { data: payments = [], isLoading } = usePaymentsByPledge(pledge?.id);

  const paid = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const balance = Number(pledge.total_amount || 0) - paid;

  return { payments, paid, balance, isLoading };
}
