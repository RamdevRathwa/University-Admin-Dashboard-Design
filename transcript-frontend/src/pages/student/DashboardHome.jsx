import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { apiRequest } from "../../services/apiClient";
import StatusBadge from "../../components/approvals/StatusBadge";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { FileSearch } from "lucide-react";

function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "success";
  if (s === "rejected") return "destructive";
  if (s.includes("forwarded")) return "default";
  if (s === "submitted") return "warning";
  return "neutral";
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [approved, setApproved] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([apiRequest("/api/transcripts/my"), apiRequest("/api/student/transcripts/approved")])
      .then(([my, appr]) => {
        if (!alive) return;
        setRequests(Array.isArray(my) ? my : []);
        setApproved(Array.isArray(appr) ? appr : []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const approvedCount = requests.filter((r) => String(r.status) === "Approved").length;
    const rejectedCount = requests.filter((r) => String(r.status) === "Rejected").length;
    const pendingCount = total - approvedCount - rejectedCount;
    return [
      { title: "Total Requests", value: total, variant: "default" },
      { title: "Approved", value: approvedCount, variant: "success" },
      { title: "Pending", value: pendingCount, variant: "warning" },
      { title: "Rejected", value: rejectedCount, variant: "destructive" },
    ];
  }, [requests]);

  const recent = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [requests]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Dashboard"
        description="Track your requests, approvals, and issued transcripts from one place."
        actions={
          <Button asChild>
            <Link to="/dashboard/request">New Transcript Request</Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">{stat.title}</CardDescription>
              {loading ? <Skeleton className="h-9 w-16" /> : <CardTitle className="text-3xl">{stat.value}</CardTitle>}
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant={stat.variant}>{stat.title}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Recent Requests</CardTitle>
              <span className="text-xs text-gray-500">Last {recent.length} items</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    <TableRow><TableCell colSpan={3}><Skeleton className="h-10" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={3}><Skeleton className="h-10" /></TableCell></TableRow>
                  </>
                ) : recent.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="py-8">
                      <EmptyState
                        icon={FileSearch}
                        title="No requests yet"
                        description="Submit your first transcript request to start the approval workflow."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-gray-900">{String(r.id).slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-gray-600 tabular-nums">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={String(r.status)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved Transcripts</CardTitle>
            <CardDescription>Download becomes available after Dean approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </>
            ) : approved.length === 0 ? (
              <div className="text-sm text-gray-600">No approved transcripts yet.</div>
            ) : (
              approved.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">Request {String(t.transcriptRequestId).slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-gray-500">Approved: {t.approvedAt ? new Date(t.approvedAt).toLocaleString("en-IN") : "-"}</div>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
