import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";
import { apiRequest } from "../../services/apiClient";

export default function HodPendingApprovals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest("/api/hod/transcript-requests/pending")
      .then((d) => (Array.isArray(d) ? d : []))
      .then((list) => alive && setRows(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const countLabel = useMemo(() => (loading ? "Loading..." : `${rows.length} records`), [loading, rows.length]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>Requests forwarded to HoD for departmental approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 mb-3">{countLabel}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-600">Loading...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">No pending approvals</p>
                    <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-900">{String(r.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{r.studentName || "-"}</TableCell>
                    <TableCell className="tabular-nums">{r.prn || "-"}</TableCell>
                    <TableCell>{r.program || "-"}</TableCell>
                    <TableCell className="text-gray-600 tabular-nums">{r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-IN") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status="Forwarded to HoD" />
                        <Button type="button" variant="outline" onClick={() => navigate(`/hod/review/${encodeURIComponent(r.id)}`)}>
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
