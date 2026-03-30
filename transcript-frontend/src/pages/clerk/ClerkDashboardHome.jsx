import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, CheckCircle2, ClipboardCheck, FileClock } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { clerkDashboardService } from "../../services/clerkDashboardService";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export default function ClerkDashboardHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    clerkDashboardService
      .get()
      .then((d) => {
        if (alive) setData(d);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const max = useMemo(() => {
    const arr = data?.workload7d || [];
    return Math.max(1, ...arr.map((x) => x.value || 0));
  }, [data]);

  const cards = [
    {
      title: "Pending Verifications",
      value: data?.stats?.pendingVerifications ?? 0,
      description: "Student submissions waiting for document review",
      icon: ClipboardCheck,
      accent: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      title: "Pending Grade Entry",
      value: data?.stats?.pendingGradeEntry ?? 0,
      description: "Verified students ready for marks entry",
      icon: FileClock,
      accent: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Forwarded To HoD",
      value: data?.stats?.forwardedToHod ?? 0,
      description: "Requests moved to the next approval stage",
      icon: ArrowRightLeft,
      accent: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      title: "Rejected Requests",
      value: data?.stats?.rejectedRequests ?? 0,
      description: "Items returned or rejected in the current cycle",
      icon: CheckCircle2,
      accent: "text-rose-600 bg-rose-50 border-rose-200",
    },
  ];

  const activities = data?.activities || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clerk Dashboard"
        description="Track verification workload, monitor grade-entry readiness, and keep transcript requests moving."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/clerk/verification")}>
              Open Verification
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/clerk/grade-entry")}>
              Open Grade Entry
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4 px-5 py-5">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{item.title}</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{loading ? "..." : item.value}</div>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Transcript Workload</h3>
                  <p className="mt-1 text-sm text-gray-500">Daily activity across the last seven days.</p>
                </div>
                <Badge variant="neutral">Last 7 days</Badge>
              </div>
            </div>
            <div className="px-6 py-6">
              {loading ? (
                <div className="grid h-44 grid-cols-7 items-end gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : (
                <div className="grid h-44 grid-cols-7 items-end gap-3">
                  {(data?.workload7d || []).map((item) => (
                    <div key={item.day} className="flex flex-col items-center gap-2">
                      <div className="flex h-full w-full items-end rounded-2xl bg-gray-100 p-1">
                        <div
                          className="w-full rounded-xl bg-[#1e40af] transition-all"
                          style={{ height: `${Math.max(10, Math.round(((item.value || 0) / max) * 160))}px` }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-xs text-gray-500">{item.day}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                  <p className="mt-1 text-sm text-gray-500">Latest clerk-side actions captured from the queue.</p>
                </div>
                {!loading && activities.length > 0 ? <div className="text-sm text-gray-500">{activities.length} items</div> : null}
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No recent clerk activity"
                  description="Verification, grade entry, and forwarding activity will appear here once requests move through the clerk workflow."
                  hint="Use the Requests and Verification pages to start processing pending items."
                />
              ) : (
                <ul className="space-y-3">
                  {activities.map((item) => (
                    <li key={item.id} className="rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-gray-800">{item.text}</p>
                        <span className="whitespace-nowrap text-xs text-gray-500">
                          {item.at ? new Date(item.at).toLocaleString("en-IN") : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
