import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  pledges: any[];
};

export default function TorahScholarPledgesTable({ pledges }: Props) {
  const { currency } = useLanguage();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Scholar Supports</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Donor</TableHead>
              <TableHead>Monthly Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pledges.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.donor_name}</TableCell>
                <TableCell>
                  {currency} {Number(p.total_amount || 0).toLocaleString()}
                </TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>{p.frequency || "monthly"}</TableCell>
                <TableCell>
                  {p.due_date
                    ? new Date(p.due_date).toLocaleDateString("en-GB")
                    : "-"}
                </TableCell>
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
      </CardContent>
    </Card>
  );
}
