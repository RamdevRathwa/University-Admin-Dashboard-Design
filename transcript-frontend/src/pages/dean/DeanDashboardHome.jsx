import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { apiRequest } from "../../services/apiClient";

export default function DeanDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest("/api/dean/transcript-requests/pending")
      .then((d) => alive && setPending(Array.isArray(d) ? d : []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const pendingCount = pending.length;
    return {
      pending: pendingCount,
      approvedToday: 0,
      rejectedToday: 0,
      totalApproved: 0,
    };
  }, [pending]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Final Approval</CardDescription>
            {loading ? <Skeleton className="h-7 w-16" /> : <CardTitle className="text-2xl">{stats.pending}</CardTitle>}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved Today</CardDescription>
            {loading ? <Skeleton className="h-7 w-16" /> : <CardTitle className="text-2xl">{stats.approvedToday}</CardTitle>}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected Today</CardDescription>
            {loading ? <Skeleton className="h-7 w-16" /> : <CardTitle className="text-2xl">{stats.rejectedToday}</CardTitle>}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Approved</CardDescription>
            {loading ? <Skeleton className="h-7 w-16" /> : <CardTitle className="text-2xl">{stats.totalApproved}</CardTitle>}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Decisions</CardTitle>
          <CardDescription>Decision history will appear here once decision/audit endpoints are enabled.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="py-10 text-center text-sm text-gray-600">
                  No decision records available.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

