import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";
import {
  Users,
  UserCog,
  FileText,
  CheckCircle2,
  CreditCard,
  Building2,
  FolderTree,
  BookOpen,
  ArrowRight,
} from "lucide-react";

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

function VitalNavCard({ title, value, icon: Icon, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-px hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{hint}</p>
        </div>
        {Icon ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-[#1e40af]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1e40af]">
        Open management
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </button>
  );
}

export default function AdminDashboardHome() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [vitals, setVitals] = useState({ faculties: 0, departments: 0, programs: 0 });
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

        const lookupTasks = [];
        const lookupKeys = [];

        if (hasPermission("institution.manage")) {
          lookupTasks.push(adminService.listFaculties(), adminService.listDepartments());
          lookupKeys.push("faculties", "departments");
        }

        if (hasPermission("curriculum.manage")) {
          lookupTasks.push(adminService.listPrograms());
          lookupKeys.push("programs");
        }

        const lookupResults = lookupTasks.length ? await Promise.all(lookupTasks) : [];
        const lookups = Object.fromEntries(lookupKeys.map((key, index) => [key, lookupResults[index]]));

        const fRes = lookups.faculties;
        const dRes = lookups.departments;
        const pRes = lookups.programs;

        const facultyItems = Array.isArray(fRes?.items) ? fRes.items : Array.isArray(fRes?.faculties) ? fRes.faculties : Array.isArray(fRes) ? fRes : [];
        const departmentItems = Array.isArray(dRes?.items)
          ? dRes.items
          : Array.isArray(dRes?.departments)
          ? dRes.departments
          : Array.isArray(dRes)
          ? dRes
          : [];
        const programItems = Array.isArray(pRes?.items) ? pRes.items : Array.isArray(pRes?.programs) ? pRes.programs : Array.isArray(pRes) ? pRes : [];

        if (!alive) return;
        setSummary(s || null);
        setActivity(Array.isArray(a?.items) ? a.items : Array.isArray(a) ? a : []);
        setVitals({
          faculties: facultyItems.length,
          departments: departmentItems.length,
          programs: programItems.length,
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load admin dashboard.");
        setSummary(null);
        setActivity([]);
        setVitals({ faculties: 0, departments: 0, programs: 0 });
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
      { title: "Approved Transcripts", value: s.approvedTranscripts ?? "—", icon: CheckCircle2 },
    ];
  }, [summary]);

  const vitalCards = useMemo(
    () =>
      [
        hasPermission("institution.manage")
          ? {
              title: "Faculty",
              value: loading ? "..." : vitals.faculties,
              icon: Building2,
              hint: "Open faculty management",
              onClick: () => navigate("/admin/faculty"),
            }
          : null,
        hasPermission("institution.manage")
          ? {
              title: "Departments",
              value: loading ? "..." : vitals.departments,
              icon: FolderTree,
              hint: "Manage department records",
              onClick: () => navigate("/admin/faculty"),
            }
          : null,
        hasPermission("curriculum.manage")
          ? {
              title: "Programs",
              value: loading ? "..." : vitals.programs,
              icon: BookOpen,
              hint: "Open program and curriculum",
              onClick: () => navigate("/admin/curriculum"),
            }
          : null,
      ].filter(Boolean),
    [hasPermission, loading, navigate, vitals.departments, vitals.faculties, vitals.programs]
  );

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertTitle>Admin API Not Available</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Academic Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {vitalCards.map((item) => (
              <VitalNavCard
                key={item.title}
                title={item.title}
                value={item.value}
                icon={item.icon}
                hint={item.hint}
                onClick={item.onClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="w-35">Time</TableHead>
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

