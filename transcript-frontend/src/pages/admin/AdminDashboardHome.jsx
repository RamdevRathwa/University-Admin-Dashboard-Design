import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { adminService } from "../../services/adminService";
import { Users, UserCog, FileText, CheckCircle2, CreditCard, AlertTriangle } from "lucide-react";

function StatCard({ title, value, icon: Icon, hint }) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {Icon ? <Icon className="h-4 w-4 text-[#1e40af]" aria-hidden="true" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [s, a] = await Promise.all([
          adminService.getDashboardSummary(),
          adminService.getRecentActivity({ limit: 10 }),
        ]);
        if (!alive) return;
        setSummary(s || null);
        setActivity(Array.isArray(a?.items) ? a.items : Array.isArray(a) ? a : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load admin dashboard.");
        setSummary(null);
        setActivity([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const s = summary || {};
    return [
      { title: "Total Students", value: s.totalStudents ?? "—", icon: Users },
      { title: "Total Staff", value: s.totalStaff ?? "—", icon: UserCog },
      { title: "Pending Transcripts", value: s.pendingTranscripts ?? "—", icon: FileText },
      { title: "Approved Transcripts", value: s.approvedTranscripts ?? "—", icon: CheckCircle2 },
      { title: "Total Payments Received", value: s.totalPaymentsReceived ?? "—", icon: CreditCard, hint: "INR" },
      { title: "System Alerts", value: s.systemAlerts ?? "—", icon: AlertTriangle },
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertTitle>Admin API Not Available</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="rounded-xl">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-20 mt-2" />
                </CardContent>
              </Card>
            ))
          : cards.map((c) => <StatCard key={c.title} {...c} />)}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : activity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-10">
                      No activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.map((row, idx) => (
                    <TableRow key={row.id || idx} className="hover:bg-gray-50">
                      <TableCell className="text-sm text-gray-600">{row.time || row.createdAt || "—"}</TableCell>
                      <TableCell className="text-sm">{row.user || row.userName || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{row.action || row.actionType || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{row.entity || row.table || row.tableName || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="rounded-xl" variant={row.success === false ? "destructive" : "secondary"}>
                          {row.success === false ? "Failed" : "OK"}
                        </Badge>
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

