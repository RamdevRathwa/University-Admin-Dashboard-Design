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
  Building2,
  FolderTree,
  BookOpen,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

const toneStyles = {
  blue: {
    shell: "border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-white shadow-[0_10px_30px_-18px_rgba(30,64,175,0.45)]",
    icon: "bg-blue-100 text-blue-700 ring-blue-200/70",
    strip: "bg-blue-500",
    title: "text-blue-950",
    value: "text-slate-900",
    hint: "text-blue-700/80",
    chip: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  emerald: {
    shell: "border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-[0_10px_30px_-18px_rgba(16,185,129,0.35)]",
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200/70",
    strip: "bg-emerald-500",
    title: "text-emerald-950",
    value: "text-slate-900",
    hint: "text-emerald-700/80",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  amber: {
    shell: "border-amber-100 bg-gradient-to-br from-amber-50/90 via-white to-white shadow-[0_10px_30px_-18px_rgba(245,158,11,0.4)]",
    icon: "bg-amber-100 text-amber-700 ring-amber-200/70",
    strip: "bg-amber-500",
    title: "text-amber-950",
    value: "text-slate-900",
    hint: "text-amber-700/80",
    chip: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  slate: {
    shell: "border-slate-200 bg-gradient-to-br from-slate-50/90 via-white to-white shadow-[0_10px_30px_-18px_rgba(71,85,105,0.28)]",
    icon: "bg-slate-100 text-slate-700 ring-slate-200/70",
    strip: "bg-slate-500",
    title: "text-slate-950",
    value: "text-slate-900",
    hint: "text-slate-600",
    chip: "bg-slate-50 text-slate-700 ring-slate-100",
  },
  violet: {
    shell: "border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-white shadow-[0_10px_30px_-18px_rgba(124,58,237,0.32)]",
    icon: "bg-violet-100 text-violet-700 ring-violet-200/70",
    strip: "bg-violet-500",
    title: "text-violet-950",
    value: "text-slate-900",
    hint: "text-violet-700/80",
    chip: "bg-violet-50 text-violet-700 ring-violet-100",
  },
};

function getToneStyles(tone = "blue") {
  return toneStyles[tone] || toneStyles.blue;
}

function StatCard({ title, value, icon: Icon, hint, onClick, compact = false, tone = "blue", badge }) {
  const isClickable = typeof onClick === "function";
  const styles = getToneStyles(tone);
  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border ${styles.shell} ${isClickable ? "cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-xl" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`h-1 w-full ${styles.strip}`} />
      <CardHeader className={compact ? "p-4 pb-2" : "p-5 pb-2"}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className={`${compact ? "text-[11px]" : "text-sm"} font-semibold uppercase tracking-[0.16em] ${styles.title}`}>{title}</CardTitle>
            {badge ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${styles.chip}`}>{badge}</span> : null}
          </div>
          {Icon ? (
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${styles.icon}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={compact ? "p-4 pt-0" : "px-5 pb-5 pt-0"}>
        <div className={`${compact ? "text-2xl" : "text-3xl"} font-semibold tracking-tight ${styles.value}`}>{value}</div>
        {hint ? <p className={`mt-1 text-xs ${styles.hint}`}>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function VitalNavCard({ title, value, icon: Icon, hint, onClick, tone = "blue" }) {
  const isClickable = typeof onClick === "function";
  const styles = getToneStyles(tone);
  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border ${styles.shell} ${isClickable ? "cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-xl" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`h-1 w-full ${styles.strip}`} />
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.title}`}>{title}</CardTitle>
            <p className={`text-xs ${styles.hint}`}>{hint}</p>
          </div>
          {Icon ? (
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${styles.icon}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className={`text-3xl font-semibold tracking-tight ${styles.value}`}>{value}</div>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#1e40af]">
          Open management
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardHome() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [vitals, setVitals] = useState({ faculties: 0, departments: 0, programs: 0, gradingSchemes: 0 });
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

        const fallbackTasks = [
          adminService.listFaculties(),
          adminService.listDepartments(),
          adminService.listPrograms(),
          adminService.listGradingSchemes(),
        ];
        const [fRes, dRes, pRes, gRes] = await Promise.all(fallbackTasks);

        const facultyItems = Array.isArray(fRes?.items) ? fRes.items : Array.isArray(fRes?.faculties) ? fRes.faculties : Array.isArray(fRes) ? fRes : [];
        const departmentItems = Array.isArray(dRes?.items)
          ? dRes.items
          : Array.isArray(dRes?.departments)
          ? dRes.departments
          : Array.isArray(dRes)
          ? dRes
          : [];
        const programItems = Array.isArray(pRes?.items) ? pRes.items : Array.isArray(pRes?.programs) ? pRes.programs : Array.isArray(pRes) ? pRes : [];
        const gradingItems = Array.isArray(gRes?.items)
          ? gRes.items
          : Array.isArray(gRes?.schemes)
          ? gRes.schemes
          : Array.isArray(gRes)
          ? gRes
          : [];

        if (!alive) return;
        setSummary(s || null);
        setActivity(Array.isArray(a?.items) ? a.items : Array.isArray(a) ? a : []);
        setVitals({
          faculties: Number(s?.totalFaculties ?? facultyItems.length ?? 0),
          departments: Number(s?.totalDepartments ?? departmentItems.length ?? 0),
          programs: Number(s?.totalPrograms ?? programItems.length ?? 0),
          gradingSchemes: Number(s?.totalGradingSchemes ?? gradingItems.length ?? 0),
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load admin dashboard.");
        setSummary(null);
        setActivity([]);
        setVitals({ faculties: 0, departments: 0, programs: 0, gradingSchemes: 0 });
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
      {
        title: "Total Students",
        value: loading ? "..." : s.totalStudents ?? 0,
        icon: Users,
        hint: "Open user management",
        onClick: () => navigate("/admin/users"),
        compact: true,
        tone: "blue",
      },
      {
        title: "Total Staff",
        value: loading ? "..." : s.totalStaff ?? 0,
        icon: UserCog,
        hint: "Open staff and user management",
        onClick: () => navigate("/admin/users"),
        compact: true,
        tone: "slate",
      },
      {
        title: "Approved Transcripts",
        value: loading ? "..." : s.approvedTranscripts ?? 0,
        icon: CheckCircle2,
        hint: "Open transcript management",
        onClick: () => navigate("/admin/transcripts"),
        compact: true,
        tone: "emerald",
      },
      {
        title: "Pending Transcripts",
        value: loading ? "..." : s.pendingTranscripts ?? 0,
        icon: FileText,
        hint: "Review transcript requests",
        onClick: () => navigate("/admin/transcripts"),
        tone: "amber",
      },
    ];
  }, [loading, navigate, summary]);

  const vitalCards = useMemo(
    () =>
      [
        {
          title: "Faculty",
          value: loading ? "..." : vitals.faculties,
          icon: Building2,
          hint: "Open faculty management",
          onClick: () => navigate("/admin/faculty"),
          tone: "blue",
        },
        {
          title: "Departments",
          value: loading ? "..." : vitals.departments,
          icon: FolderTree,
          hint: "Manage department records",
          onClick: () => navigate("/admin/faculty"),
          tone: "emerald",
        },
        {
          title: "Programs",
          value: loading ? "..." : vitals.programs,
          icon: BookOpen,
          hint: "Open program and curriculum",
          onClick: () => navigate("/admin/curriculum"),
          tone: "violet",
        },
        {
          title: "Grading Schemes",
          value: loading ? "..." : vitals.gradingSchemes,
          icon: SlidersHorizontal,
          hint: "Open grading configuration",
          onClick: () => navigate("/admin/grading"),
          tone: "amber",
        },
      ],
    [loading, navigate, vitals.departments, vitals.faculties, vitals.gradingSchemes, vitals.programs]
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {vitalCards.map((item) => (
              <VitalNavCard
                key={item.title}
                title={item.title}
                value={item.value}
                icon={item.icon}
                hint={item.hint}
                onClick={item.onClick}
                tone={item.tone}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
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

