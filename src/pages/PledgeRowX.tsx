import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpDown } from "lucide-react";

import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
} from "@/components/ui/table";

type PledgeRowProps = {
  pledge: any;
  payments: any[];
  paid: number;
  balance: number;
  orgName?: string;

  /** Only date formatter comes from parent */
  formatDate: (val: string | null | undefined) => string;

  onAddPayment: () => void;
};

export default function PledgeRow({
  pledge,
  payments,
  paid,
  balance,
  orgName,
  formatDate,
  onAddPayment,
}: PledgeRowProps) {
  /* ---------------------------------------------------
     LOCAL CURRENCY FORMATTER
  --------------------------------------------------- */
  const currency = pledge.currency || ""; // ← ALWAYS correct per pledge/org ID

  const formatAmount = (v: number | null | undefined) => {
    const n = Number(v || 0);
    return `${currency} ${n.toLocaleString()}`;
  };

  /* ---------------------------------------------------
     SORT STATE
  --------------------------------------------------- */
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ---------------------------------------------------
     SORT LOGIC
  --------------------------------------------------- */
  const sortedPayments = useMemo(() => {
    if (!sortField) return payments;

    const accessors: any = {
      amount: (p: any) => Number(p.amount || 0),
      date: (p: any) => p.date || "",
      method: (p: any) => (p.payment_method || "").toLowerCase(),
      notes: (p: any) => (p.notes || "").toLowerCase(),
    };

    return [...payments].sort((a, b) => {
      const A = accessors[sortField](a);
      const B = accessors[sortField](b);

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [payments, sortField, sortDir]);

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  return (
    <div className="border rounded-lg p-3 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {orgName && <Badge variant="outline">{orgName}</Badge>}

            <span className="text-xs text-muted-foreground">
              Due: {formatDate(pledge.due_date)}
            </span>
          </div>

          <div className="flex gap-4 text-xs mt-1">
            <span>Total: {formatAmount(pledge.total_amount)}</span>
            <span>Paid: {formatAmount(paid)}</span>
            <span>Balance: {formatAmount(balance)}</span>
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            Created: {formatDate(pledge.created_at)}
          </div>
        </div>

        <Button size="sm" className="gap-1" onClick={onAddPayment}>
          <PlusCircle className="w-4 h-4" />
          Add Payment
        </Button>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => toggleSort("amount")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  Amount <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => toggleSort("date")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  Date <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => toggleSort("method")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  Method <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => toggleSort("notes")}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  Notes <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedPayments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-xs text-muted-foreground"
                >
                  No payments yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatAmount(p.amount)}</TableCell>
                  <TableCell>{formatDate(p.date)}</TableCell>
                  <TableCell>{p.payment_method || "-"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {p.notes || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
