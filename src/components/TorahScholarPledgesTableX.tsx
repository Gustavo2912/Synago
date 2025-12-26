import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TorahScholarPledgesTable({ pledges }) {
  return (
    <div className="border glass rounded-xl shadow-md overflow-hidden mt-6">
      <Table className="text-sm">
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>Donor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pledges.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.donor_name}</TableCell>
              <TableCell>{p.amount_paid || p.total_amount || "Monthly"}</TableCell>
              <TableCell>{p.frequency}</TableCell>
              <TableCell>{p.status}</TableCell>
              <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}

          {pledges.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                No scholar supports yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
