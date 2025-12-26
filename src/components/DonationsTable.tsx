import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Donation } from "@/hooks/useDonations";

export type DonationsTableProps = {
  donations: Donation[];
  currencySymbol?: string;
  onEdit?: (donation: Donation) => void;
  onDelete?: (donation: Donation) => void;
};

export function DonationsTable({
  donations,
  currencySymbol = "",
  onEdit,
  onDelete,
}: DonationsTableProps) {
  if (!donations || donations.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No donations yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Designation</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
          {(onEdit || onDelete) && (
            <TableHead className="text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>

      <TableBody>
        {donations.map((d) => (
          <TableRow key={d.id}>
            <TableCell>
              {d.date ? format(new Date(d.date), "yyyy-MM-dd") : ""}
            </TableCell>

            <TableCell>
              {currencySymbol}
              {typeof d.amount === "number"
                ? d.amount.toFixed(2)
                : Number(d.amount || 0).toFixed(2)}
            </TableCell>

            <TableCell>{d.type || "-"}</TableCell>
            <TableCell>{d.designation || "-"}</TableCell>
            <TableCell>{d.paymentMethod || "-"}</TableCell>
            <TableCell>{d.status || "-"}</TableCell>

            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
              {d.notes || "-"}
            </TableCell>

            {(onEdit || onDelete) && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {onEdit && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(d)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {onDelete && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(d)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// גם default export וגם export בשם
export default DonationsTable;
