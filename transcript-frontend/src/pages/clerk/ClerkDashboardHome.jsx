import { useEffect, useMemo, useState } from "react";
import { clerkDashboardService } from "../../services/clerkDashboardService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";

export default function ClerkDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    clerkDashboardService
      .get()
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const max = useMemo(() => {
    const arr = data?.workload7d || [];
    return Math.max(1, ...arr.map((x) => x.value));
  }, [data]);

  const cards = [
    { title: "Pending Verifications", value: data?.stats?.pendingVerifications ?? 0, badge: "warning" },
    { title: "Pending Grade Entry", value: data?.stats?.pendingGradeEntry ?? 0, badge: "default" },
    { title: "Requests Forwarded to HoD", value: data?.stats?.forwardedToHod ?? 0, badge: "success" },
    { title: "Rejected Requests", value: data?.stats?.rejectedRequests ?? 0, badge: "destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clerk Dashboard</h2>
        <p className="text-sm text-gray-500">Overview of verification, grade entry, and transcript workload.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {cards.map((c) => (
          <Card key={c.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">{c.title}</CardDescription>
              {loading ? <Skeleton className="h-9 w-16" /> : <CardTitle className="text-3xl">{c.value}</CardTitle>}
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant={c.badge}>{c.title}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Transcript Workload (Past 7 Days)</CardTitle>
              <span className="text-xs text-gray-500">Last 7 days</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-7 gap-3 items-end h-44">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-3 items-end h-44">
                {(data?.workload7d || []).map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-xl overflow-hidden">
                      <div
                        className="bg-[#1e40af] rounded-xl transition-all"
                        style={{ height: `${Math.max(8, Math.round((d.value / max) * 160))}px` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs text-gray-500">{d.day}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Recent Activities</CardTitle>
              <span className="text-xs text-gray-500">Last 24 hours</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
              <ul className="space-y-3">
                {(data?.activities || []).length === 0 ? (
                  <li className="p-3 rounded-xl border border-gray-200 text-sm text-gray-600">No recent activity.</li>
                ) : null}
                {(data?.activities || []).map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                    <p className="text-sm text-gray-800">{a.text}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{a.at ? new Date(a.at).toLocaleString("en-IN") : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
