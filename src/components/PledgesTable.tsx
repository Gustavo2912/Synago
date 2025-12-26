import { format } from "date-fns";
import { Bell } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Pledge } from "@/hooks/usePledges";

export type PledgesTableProps = {
  pledges: Pledge[];
  currencySymbol?: string;
  onSendReminder?: (pledge: Pledge) => void;
  sendingId?: string | null;
};

export function PledgesTable({
  pledges,
  currencySymbol = "",
  onSendReminder,
  sendingId,
}: PledgesTableProps) {
  if (!pledges || pledges.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No pledges yet.
      </div>
    );
  }

  const showActions = Boolean(onSendReminder);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Created</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last reminder</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>

      <TableBody>
        {pledges.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              {p.created_at
                ? format(new Date(p.created_at), "yyyy-MM-dd")
                : ""}
            </TableCell>

            <TableCell>
              {currencySymbol}
              {Number(p.total_amount || 0).toFixed(2)}
            </TableCell>

            <TableCell>
              {currencySymbol}
              {Number(p.amount_paid || 0).toFixed(2)}
            </TableCell>

            <TableCell>
              {currencySymbol}
              {Number(p.balance_owed || 0).toFixed(2)}
            </TableCell>

            <TableCell>{p.frequency || "-"}</TableCell>
            <TableCell>{p.status || "-"}</TableCell>

            <TableCell>
              {p.last_reminder_sent
                ? format(new Date(p.last_reminder_sent), "yyyy-MM-dd")
                : "-"}
            </TableCell>

            {showActions && (
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={sendingId === p.id}
                  onClick={() => onSendReminder && onSendReminder(p)}
                  className="flex items-center gap-1"
                >
                  <Bell className="h-4 w-4" />
                  {sendingId === p.id ? "Sending..." : "Send reminder"}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// גם default export וגם export בשם
export default PledgesTable;
