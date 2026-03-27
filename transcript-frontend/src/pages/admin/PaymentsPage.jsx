import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { adminService } from "../../services/adminService";
import { CreditCard, Download } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  if (s.includes("COMPLETE")) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
  if (s.includes("PENDING")) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
  if (s.includes("FAIL")) return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">{status || "—"}</Badge>;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listPayments({ q, status: status === "All" ? "" : status, page: 1, pageSize: 50 });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res?.payments) ? res.payments : Array.isArray(res) ? res : [];
      setRows(items);
    } catch (e) {
      setError(e?.message || "Failed to load payments.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description="Review payment records, statuses, and receipt availability from one place."
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Payments</CardTitle>
              <p className="text-sm text-gray-500 mt-1">View payment records and receipts (export later).</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <CreditCard className="h-4 w-4 text-[#1e40af]" />
              Finance
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <Label>Search</Label>
              <Input className="rounded-xl mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="PRN / reference / transaction id" />
            </div>
            <div className="lg:col-span-3">
              <Label>Status</Label>
              <div className="mt-1">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-2 flex items-end">
              <Button variant="outline" className="rounded-xl w-full" onClick={load}>
                Apply
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>PRN</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <EmptyState
                        icon={CreditCard}
                        title="No payment records found"
                        description="The page is ready, but the payment module has not produced any transactions for the selected filters yet."
                        badge="No Data Yet"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id || p.paymentId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{p.reference || p.paymentReference || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{p.prn || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{p.amount ?? "—"} {p.currency || "INR"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{p.method || p.paymentMethod || "—"}</TableCell>
                      <TableCell><StatusBadge status={p.status || p.paymentStatus} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" className="rounded-xl" disabled title="Receipt download requires backend endpoint">
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
