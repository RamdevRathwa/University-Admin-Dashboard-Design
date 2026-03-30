import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, FileSearch, Users } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";
import { apiRequest } from "../../services/apiClient";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
}

export default function HodDashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    apiRequest("/api/hod/transcript-requests/pending")
      .then((data) => {
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const pending = rows.length;
    return [
      {
        title: "Pending Approvals",
        value: pending,
        description: "Requests currently awaiting HoD review",
        icon: Clock3,
        accent: "text-amber-600 bg-amber-50 border-amber-200",
      },
      {
        title: "Students In Queue",
        value: new Set(rows.map((row) => row?.prn).filter(Boolean)).size,
        description: "Unique students represented in the queue",
        icon: Users,
        accent: "text-blue-600 bg-blue-50 border-blue-200",
      },
      {
        title: "Ready To Review",
        value: pending,
        description: "Items available for immediate decision",
        icon: FileSearch,
        accent: "text-violet-600 bg-violet-50 border-violet-200",
      },
      {
        title: "Cleared Today",
        value: 0,
        description: "Approvals completed during this session",
        icon: CheckCircle2,
        accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      },
    ];
  }, [rows]);

  const recentRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="HoD Dashboard"
        description="Review departmental transcript requests, monitor the active queue, and move verified requests forward."
        actions={
          <Button type="button" variant="outline" onClick={() => navigate("/hod/pending")}>
            Open Pending Approvals
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4 px-5 py-5">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{item.title}</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{item.value}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${item.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Recent Queue Activity</CardTitle>
              <CardDescription>Latest requests forwarded to HoD for departmental approval.</CardDescription>
            </div>
            {!loading && rows.length > 0 ? (
              <div className="text-sm text-gray-500">{rows.length} pending in queue</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : recentRows.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No pending HoD approvals"
              description="Your review queue is currently clear. New requests forwarded by the clerk will appear here."
              hint="You can still open the pending approvals page anytime to recheck the queue."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>PRN</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-gray-900">{String(row.id || "").slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{row.studentName || "-"}</div>
                      </TableCell>
                      <TableCell className="tabular-nums">{row.prn || "-"}</TableCell>
                      <TableCell>{row.program || "-"}</TableCell>
                      <TableCell className="text-gray-600">{formatDateTime(row.submittedAt)}</TableCell>
                      <TableCell>
                        <StatusBadge status="Forwarded to HoD" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" onClick={() => navigate(`/hod/review/${encodeURIComponent(row.id)}`)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
