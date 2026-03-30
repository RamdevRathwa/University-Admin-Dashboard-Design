import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, FileSignature, ShieldCheck } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";
import { apiRequest } from "../../services/apiClient";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
}

export default function DeanDashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest("/api/dean/transcript-requests/pending")
      .then((d) => {
        if (!alive) return;
        setPending(Array.isArray(d) ? d : []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        title: "Pending Final Approval",
        value: pending.length,
        description: "Requests currently awaiting dean sign-off",
        icon: Clock3,
        accent: "text-amber-600 bg-amber-50 border-amber-200",
      },
      {
        title: "Programs In Queue",
        value: new Set(pending.map((item) => item?.program).filter(Boolean)).size,
        description: "Distinct academic programs in the current queue",
        icon: FileSignature,
        accent: "text-blue-600 bg-blue-50 border-blue-200",
      },
      {
        title: "Ready To Finalize",
        value: pending.length,
        description: "Requests available for immediate final review",
        icon: ShieldCheck,
        accent: "text-violet-600 bg-violet-50 border-violet-200",
      },
      {
        title: "Approved Today",
        value: 0,
        description: "Final approvals completed during this session",
        icon: CheckCircle2,
        accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      },
    ],
    [pending]
  );

  const recentRows = pending.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dean Dashboard"
        description="Monitor the final approval queue, review transcript requests, and complete academic authorization."
        actions={
          <Button type="button" variant="outline" onClick={() => navigate("/dean/pending")}>
            Open Final Approvals
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
        <CardContent className="p-0">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Recent Final Approval Queue</h3>
                <p className="mt-1 text-sm text-gray-500">Latest requests forwarded by HoD for dean-level final approval.</p>
              </div>
              {!loading && pending.length > 0 ? <div className="text-sm text-gray-500">{pending.length} pending in queue</div> : null}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : recentRows.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No dean approvals pending"
                description="The final approval queue is currently clear. Requests approved by HoD will appear here automatically."
                hint="Use the pending approvals page anytime if you want to recheck the queue."
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
                        <TableCell className="font-medium text-gray-900">{row.studentName || "-"}</TableCell>
                        <TableCell className="tabular-nums">{row.prn || "-"}</TableCell>
                        <TableCell>{row.program || "-"}</TableCell>
                        <TableCell className="text-gray-600">{formatDateTime(row.submittedAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status="Forwarded to Dean" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" onClick={() => navigate(`/dean/review/${encodeURIComponent(row.id)}`)}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
