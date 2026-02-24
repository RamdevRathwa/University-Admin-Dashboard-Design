import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";

export default function Payments() {
  const paymentSummary = {
    totalPaid: 2500,
    totalPending: 500,
    totalTransactions: 5,
  };

  const transactions = [
    { id: "TXN-001", date: "2024-01-15", amount: 500, status: "Completed", description: "Transcript Request #TR-002", receipt: "REC-001" },
    { id: "TXN-002", date: "2024-01-10", amount: 500, status: "Completed", description: "Transcript Request #TR-001", receipt: "REC-002" },
    { id: "TXN-003", date: "2024-01-05", amount: 500, status: "Pending", description: "Transcript Request #TR-003", receipt: null },
    { id: "TXN-004", date: "2023-12-20", amount: 500, status: "Completed", description: "Transcript Request #TR-004", receipt: "REC-003" },
    { id: "TXN-005", date: "2023-12-15", amount: 500, status: "Completed", description: "Transcript Request #TR-005", receipt: "REC-004" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">View your payment summary and transaction history.</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <SummaryCard title="Total Paid" value={`Rs. ${paymentSummary.totalPaid}`} badgeVariant="success" />
        <SummaryCard title="Pending Payment" value={`Rs. ${paymentSummary.totalPending}`} badgeVariant="warning" />
        <SummaryCard title="Total Transactions" value={paymentSummary.totalTransactions} badgeVariant="default" />
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Transaction History</CardTitle>
              <CardDescription>{transactions.length} records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-gray-900">{tx.id}</TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                  <TableCell className="font-medium text-gray-900">Rs. {tx.amount}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell>
                    {tx.receipt ? (
                      <Button variant="ghost" className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline">
                        Download Receipt
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">Not available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, badgeVariant }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs uppercase tracking-wide">{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Badge variant={badgeVariant}>{title}</Badge>
      </CardContent>
    </Card>
  );
}

function PaymentStatusBadge({ status }) {
  const config = {
    Completed: { variant: "success", label: "Completed" },
    Pending: { variant: "warning", label: "Pending" },
    Failed: { variant: "destructive", label: "Failed" },
  };
  const c = config[status] || config.Pending;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
