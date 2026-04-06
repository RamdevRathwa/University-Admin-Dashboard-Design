import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import StatusBadge from "../../components/approvals/StatusBadge";
import { apiRequest } from "../../services/apiClient";

export default function HodApprovedRequests() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    apiRequest("/api/hod/transcript-requests/approved")
      .then((data) => alive && setRows(Array.isArray(data) ? data : []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const countLabel = useMemo(() => (loading ? "Loading..." : `${rows.length} records`), [loading, rows.length]);

  return (
    <div className="space-y-6">
      <PageHeader title="Approved Requests" description="Review requests that were approved by HoD and moved forward in the workflow." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval History</CardTitle>
          <CardDescription>{countLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-600">Loading approval history...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No approved requests yet"
              description="Approved HoD decisions will appear here once requests move beyond the HoD stage."
              badge="History"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>PRN</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Approved On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-900">{String(row.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{row.studentName || "-"}</TableCell>
                    <TableCell className="tabular-nums">{row.prn || "-"}</TableCell>
                    <TableCell>{row.program || "-"}</TableCell>
                    <TableCell>{row.department || "-"}</TableCell>
                    <TableCell className="text-gray-600 tabular-nums">{row.decisionAt ? new Date(row.decisionAt).toLocaleString("en-IN") : "-"}</TableCell>
                    <TableCell><StatusBadge status={row.status || "Approved by HoD"} /></TableCell>
                    <TableCell className="max-w-[280px] truncate text-gray-600">{row.remarks || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
