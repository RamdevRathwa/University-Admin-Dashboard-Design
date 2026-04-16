
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookCopy,
  BookOpenText,
  CalendarRange,
  CheckCircle2,
  Filter,
  GripVertical,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  CopyPlus,
} from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { getElectiveOptions } from "../../components/clerk/grade-entry/electiveOptions";

const defaultForm = {
  id: "",
  semesterNumber: "1",
  displayOrder: "1",
  subjectCode: "",
  subjectName: "",
  titleOnTranscript: "",
  thHours: "0",
  prHours: "0",
  thCredits: "0",
  prCredits: "0",
  hasTheory: "true",
  hasPractical: "false",
  isElective: "false",
  active: "true",
};

const statCardStyles = [
  { key: "program", label: "Program", icon: BookOpenText, iconWrap: "bg-blue-50 text-blue-700", valueClass: "text-gray-900" },
  { key: "academicYear", label: "Academic Year", icon: CalendarRange, iconWrap: "bg-indigo-50 text-indigo-700", valueClass: "text-gray-900" },
  { key: "version", label: "Version", icon: Layers3, iconWrap: "bg-violet-50 text-violet-700", valueClass: "text-gray-900" },
  { key: "totalSubjects", label: "Total Subjects", icon: BookCopy, iconWrap: "bg-sky-50 text-sky-700", valueClass: "text-gray-900" },
  { key: "activeSubjects", label: "Active Subjects", icon: CheckCircle2, iconWrap: "bg-emerald-50 text-emerald-700", valueClass: "text-gray-900" },
  { key: "electives", label: "Electives", icon: Filter, iconWrap: "bg-amber-50 text-amber-700", valueClass: "text-gray-900" },
];

function buildPayload(subject) {
  return {
    semesterNumber: Number(subject.semesterNumber || 1),
    displayOrder: Number(subject.displayOrder || 1),
    subjectCode: (subject.subjectCode || "").trim(),
    subjectName: (subject.subjectName || "").trim(),
    titleOnTranscript: (subject.titleOnTranscript || subject.subjectName || "").trim(),
    thHours: Number(subject.thHours || 0),
    prHours: Number(subject.prHours || 0),
    thCredits: Number(subject.thCredits || 0),
    prCredits: Number(subject.prCredits || 0),
    hasTheory: Boolean(subject.hasTheory),
    hasPractical: Boolean(subject.hasPractical),
    isElective: Boolean(subject.isElective),
    active: subject.active !== false,
  };
}

export default function CurriculumSubjectsPage() {
  const { versionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [versions, setVersions] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [semesterFilter, setSemesterFilter] = useState("1");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [draggingId, setDraggingId] = useState("");
  const [cloning, setCloning] = useState(false);
  const [resolvedVersionInfo, setResolvedVersionInfo] = useState(location.state || {});

  const versionInfo = resolvedVersionInfo;
  const curriculumBasePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/admin")) return "/admin/curriculum";
    if (path.startsWith("/clerk")) return "/clerk/modules/curriculum";
    if (path.startsWith("/hod")) return "/hod/modules/curriculum";
    if (path.startsWith("/dean")) return "/dean/modules/curriculum";
    return "/admin/curriculum";
  }, [location.pathname]);

  const locked = false;
  const cloneSourceVersion = useMemo(() => {
    const currentId = String(versionId || "");
    return versions
      .filter((version) => String(version.id || version.versionId || "") !== currentId)
      .filter((version) => Number(version.subjectCount || 0) > 0)
      .sort((a, b) => Number(b.versionNo || 0) - Number(a.versionNo || 0))[0];
  }, [versionId, versions]);

  const loadSubjects = async () => {
    if (!versionId) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listCurriculumSubjects(versionId);
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setSubjects(list);
      setSemesterFilter((current) => {
        if (current && list.some((item) => String(item.semesterNumber || 1) === current)) return current;
        return list[0] ? String(list[0].semesterNumber || 1) : "1";
      });
    } catch (e) {
      setError(e?.message || "Failed to load curriculum subjects.");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  useEffect(() => {
    const programId = versionInfo.programId;
    if (!programId) return;
    let alive = true;
    adminService
      .listCurriculumVersions(programId)
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        setVersions(list);
      })
      .catch(() => alive && setVersions([]));
    return () => {
      alive = false;
    };
  }, [versionInfo.programId]);

  useEffect(() => {
    if (!versionId) return;
    let alive = true;
    adminService
      .getCurriculumVersion(versionId)
      .then((info) => {
        if (!alive) return;
        setResolvedVersionInfo((current) => ({ ...current, ...info }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [versionId]);

  const semesterCounts = useMemo(() => {
    const map = new Map();
    for (let sem = 1; sem <= 8; sem += 1) map.set(String(sem), 0);
    for (const subject of subjects) {
      const key = String(subject.semesterNumber || 1);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [subjects]);

  const semesterSubjects = useMemo(
    () => subjects
      .filter((subject) => String(subject.semesterNumber || 1) === String(semesterFilter))
      .sort((a, b) => (Number(a.displayOrder || 0) - Number(b.displayOrder || 0)) || String(a.subjectCode || "").localeCompare(String(b.subjectCode || ""))),
    [subjects, semesterFilter]
  );

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return semesterSubjects.filter((subject) => {
      const matchesSearch = !query || `${subject.subjectCode || ""} ${subject.subjectName || ""} ${subject.titleOnTranscript || ""}`.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || (typeFilter === "elective" && subject.isElective) || (typeFilter === "core" && !subject.isElective);
      const isActive = subject.active !== false;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && isActive) || (statusFilter === "inactive" && !isActive);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [semesterSubjects, search, typeFilter, statusFilter]);

  const statTotal = subjects.length;
  const statActive = subjects.filter((subject) => subject.active !== false).length;
  const statElectives = subjects.filter((subject) => subject.isElective).length;
  const overviewStats = [
    { ...statCardStyles[0], value: versionInfo.programName || versionInfo.programCode || "Selected Version" },
    { ...statCardStyles[1], value: versionInfo.academicYear || "-" },
    { ...statCardStyles[2], value: versionInfo.versionName || "-" },
    { ...statCardStyles[3], value: String(statTotal) },
    { ...statCardStyles[4], value: String(statActive) },
    { ...statCardStyles[5], value: String(statElectives) },
  ];

  const updateSubjectLocally = (subjectId, patch) => {
    setSubjects((current) => current.map((subject) => (String(subject.id) === String(subjectId) ? { ...subject, ...patch } : subject)));
  };

  const persistInlineUpdate = async (subject, patch, successTitle = "Subject updated") => {
    if (!subject?.id || !versionId || locked) return;
    const nextSubject = { ...subject, ...patch };
    updateSubjectLocally(subject.id, patch);
    try {
      await adminService.updateCurriculumSubject(subject.id, versionId, buildPayload(nextSubject));
      toast({ title: successTitle });
    } catch (e) {
      updateSubjectLocally(subject.id, subject);
      toast({ title: "Could not save changes", description: e?.message || "The inline update could not be saved.", variant: "destructive" });
    }
  };

  const openCreate = () => {
    setForm({ ...defaultForm, semesterNumber: String(semesterFilter || "1"), displayOrder: String((semesterCounts.get(String(semesterFilter)) || 0) + 1) });
    setOpen(true);
  };

  const openEdit = (subject) => {
    setForm({
      id: String(subject.id || ""),
      semesterNumber: String(subject.semesterNumber || 1),
      displayOrder: String(subject.displayOrder || 1),
      subjectCode: subject.subjectCode || "",
      subjectName: subject.subjectName || "",
      titleOnTranscript: subject.titleOnTranscript || "",
      thHours: String(subject.thHours ?? 0),
      prHours: String(subject.prHours ?? 0),
      thCredits: String(subject.thCredits ?? 0),
      prCredits: String(subject.prCredits ?? 0),
      hasTheory: String(Boolean(subject.hasTheory)),
      hasPractical: String(Boolean(subject.hasPractical)),
      isElective: String(Boolean(subject.isElective)),
      active: String(subject.active !== false),
    });
    setOpen(true);
  };
  const saveSubject = async () => {
    if (!versionId) return;
    setSaving(true);
    try {
      const payload = {
        semesterNumber: Number(form.semesterNumber),
        displayOrder: Number(form.displayOrder),
        subjectCode: form.subjectCode.trim(),
        subjectName: form.subjectName.trim(),
        titleOnTranscript: form.titleOnTranscript.trim() || form.subjectName.trim(),
        thHours: Number(form.thHours),
        prHours: Number(form.prHours),
        thCredits: Number(form.thCredits),
        prCredits: Number(form.prCredits),
        hasTheory: form.hasTheory === "true",
        hasPractical: form.hasPractical === "true",
        isElective: form.isElective === "true",
        active: form.active === "true",
      };

      if (form.id) await adminService.updateCurriculumSubject(form.id, versionId, payload);
      else await adminService.createCurriculumSubject(versionId, payload);

      toast({ title: form.id ? "Subject updated" : "Subject added" });
      setOpen(false);
      setForm(defaultForm);
      await loadSubjects();
    } catch (e) {
      toast({ title: "Could not save subject", description: e?.message || "Please review the subject details and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async (subject) => {
    if (!subject?.id || locked) return;
    if (!window.confirm(`Remove ${subject.subjectCode || subject.subjectName} from this version?`)) return;
    try {
      await adminService.deleteCurriculumSubject(subject.id);
      toast({ title: "Subject removed" });
      await loadSubjects();
    } catch (e) {
      toast({ title: "Could not remove subject", description: e?.message || "This subject could not be removed.", variant: "destructive" });
    }
  };

  const cloneFromEarlierVersion = async () => {
    if (!versionId || !cloneSourceVersion?.id || locked || cloning) return;
    const label = `${cloneSourceVersion.versionName || cloneSourceVersion.name || "earlier version"} (${cloneSourceVersion.academicYear || cloneSourceVersion.year || ""})`;
    if (!window.confirm(`Clone all subjects from ${label.trim()} into this version? You can edit them after cloning.`)) return;

    setCloning(true);
    try {
      const res = await adminService.cloneCurriculumSubjects(cloneSourceVersion.id || cloneSourceVersion.versionId, versionId);
      toast({ title: "Subjects cloned", description: `${res?.copied ?? "Selected"} subjects copied into this version.` });
      await loadSubjects();
    } catch (e) {
      toast({ title: "Could not clone subjects", description: e?.message || "The earlier version could not be cloned.", variant: "destructive" });
    } finally {
      setCloning(false);
    }
  };

  const reorderSemesterSubjects = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId || locked || !versionId) return;
    const currentRows = [...semesterSubjects];
    const sourceIndex = currentRows.findIndex((subject) => String(subject.id) === String(sourceId));
    const targetIndex = currentRows.findIndex((subject) => String(subject.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextRows = [...currentRows];
    const [moved] = nextRows.splice(sourceIndex, 1);
    nextRows.splice(targetIndex, 0, moved);
    const changedRows = nextRows.map((subject, index) => ({ ...subject, displayOrder: index + 1 }));

    setSubjects((current) =>
      current.map((subject) => {
        const replacement = changedRows.find((row) => String(row.id) === String(subject.id));
        return replacement ? { ...subject, displayOrder: replacement.displayOrder } : subject;
      })
    );

    try {
      await Promise.all(changedRows.map((subject) => adminService.updateCurriculumSubject(subject.id, versionId, buildPayload(subject))));
      toast({ title: `Semester ${semesterFilter} order updated` });
    } catch (e) {
      toast({ title: "Could not reorder subjects", description: e?.message || "The order change could not be saved.", variant: "destructive" });
      await loadSubjects();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        className="sticky top-4 z-20 rounded-3xl border border-gray-200/80 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85"
        title="Manage Curriculum Subjects"
        description="Semester-wise subject mapping for this curriculum version."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate(curriculumBasePath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={openCreate} disabled={locked}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={cloneFromEarlierVersion}
              disabled={locked || cloning || subjects.length > 0 || !cloneSourceVersion}
              title={subjects.length > 0 ? "Clone is available only before adding subjects to this version." : "Clone subjects from an earlier version"}
            >
              <CopyPlus className="mr-2 h-4 w-4" />
              {cloning ? "Cloning..." : "Clone Previous"}
            </Button>
          </div>
        }
      />

      <Alert className="rounded-2xl border-sky-200 bg-sky-50 text-sky-900 shadow-sm">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="font-medium">Curriculum editing is enabled for now.</AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl shadow-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
        <div className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-6">
          {overviewStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex min-h-23 items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.iconWrap}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 self-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">{item.label}</p>
                  <p className={`mt-1 truncate text-lg font-semibold leading-tight ${item.valueClass}`}>{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-slate-50 p-1">
          {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => {
            const key = String(semester);
            const active = semesterFilter === key;
            return (
              <button
                key={semester}
                type="button"
                onClick={() => setSemesterFilter(key)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium leading-none transition-all ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "border-transparent bg-transparent text-gray-700 hover:bg-white hover:text-blue-700"
                }`}
              >
                <span>Semester {semester}</span>
                <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-100 text-gray-600"}`}>
                  {semesterCounts.get(key) || 0}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="rounded-3xl border border-gray-200/80 bg-white shadow-sm">
            <CardHeader className="space-y-4 border-b border-gray-100 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Semester {semesterFilter} Subjects</CardTitle>
                  <p className="mt-1 text-sm text-gray-500">Manage ordering, hours, credits, and subject type from one place.</p>
                </div>
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs">{filteredSubjects.length} visible</Badge>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input className="rounded-2xl border-gray-200 pl-9" placeholder="Search code, subject, or transcript title" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Filter type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="elective">Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Filter status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">Active + Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-auto rounded-b-3xl">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow className="border-b border-gray-200 bg-white">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-28">Code</TableHead>
                      <TableHead className="min-w-70">Subject</TableHead>
                      <TableHead className="w-40">Hours</TableHead>
                      <TableHead className="w-40">Credits</TableHead>
                      <TableHead className="w-44">Type</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, rowIndex) => (
                        <TableRow key={rowIndex}><TableCell colSpan={7} className="py-8 text-sm text-gray-500">Loading subjects...</TableCell></TableRow>
                      ))
                    ) : filteredSubjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-14">
                          <EmptyState icon={BookCopy} title="No subjects added yet" description="Start with the Add Subject button to define this semester for the selected curriculum version." />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubjects.map((subject, index) => {
                        const rowTone = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";
                        return (
                          <TableRow
                            key={subject.id}
                            draggable={!locked}
                            onDragStart={() => setDraggingId(String(subject.id))}
                            onDragOver={(event) => { if (!locked) event.preventDefault(); }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSemesterSubjects(draggingId, String(subject.id));
                              setDraggingId("");
                            }}
                            className={`${rowTone} border-b border-gray-100 transition-colors hover:bg-blue-50/60`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2 text-gray-500">
                                <GripVertical className="h-4 w-4" />
                                <span className="font-medium text-gray-700">{subject.displayOrder || index + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">{subject.subjectCode || "-"}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-900">{subject.subjectName || "-"}</p>
                                <p className="text-xs text-gray-500">Transcript title: {subject.titleOnTranscript || subject.subjectName || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" min="0" step="0.5" className="h-9 rounded-xl bg-white" value={subject.thHours ?? 0} disabled={locked} onChange={(e) => updateSubjectLocally(subject.id, { thHours: e.target.value })} onBlur={() => persistInlineUpdate(subject, { thHours: Number(subject.thHours || 0) }, "Hours updated")} aria-label={`${subject.subjectCode || subject.subjectName} theory hours`} />
                                <Input type="number" min="0" step="0.5" className="h-9 rounded-xl bg-white" value={subject.prHours ?? 0} disabled={locked} onChange={(e) => updateSubjectLocally(subject.id, { prHours: e.target.value })} onBlur={() => persistInlineUpdate(subject, { prHours: Number(subject.prHours || 0) }, "Hours updated")} aria-label={`${subject.subjectCode || subject.subjectName} practical hours`} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" min="0" step="0.5" className="h-9 rounded-xl bg-white" value={subject.thCredits ?? 0} disabled={locked} onChange={(e) => updateSubjectLocally(subject.id, { thCredits: e.target.value })} onBlur={() => persistInlineUpdate(subject, { thCredits: Number(subject.thCredits || 0) }, "Credits updated")} aria-label={`${subject.subjectCode || subject.subjectName} theory credits`} />
                                <Input type="number" min="0" step="0.5" className="h-9 rounded-xl bg-white" value={subject.prCredits ?? 0} disabled={locked} onChange={(e) => updateSubjectLocally(subject.id, { prCredits: e.target.value })} onBlur={() => persistInlineUpdate(subject, { prCredits: Number(subject.prCredits || 0) }, "Credits updated")} aria-label={`${subject.subjectCode || subject.subjectName} practical credits`} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Badge className={subject.isElective ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"}>{subject.isElective ? "Elective" : "Core"}</Badge>
                                {subject.hasTheory ? <Badge variant="outline">Theory</Badge> : null}
                                {subject.hasPractical ? <Badge variant="outline">Practical</Badge> : null}
                                {subject.active === false ? <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">Inactive</Badge> : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" className="rounded-xl" onClick={() => openEdit(subject)} disabled={locked} title="Edit subject"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="rounded-xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => deleteSubject(subject)} disabled={locked} title="Delete subject"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-190 rounded-3xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={form.semesterNumber} onValueChange={(value) => setForm((prev) => ({ ...prev, semesterNumber: value }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                    <SelectItem key={semester} value={String(semester)}>Semester {semester}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Display Order</Label><Input className="rounded-xl" type="number" min="1" value={form.displayOrder} onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Subject Code</Label><Input className="rounded-xl" value={form.subjectCode} onChange={(e) => setForm((prev) => ({ ...prev, subjectCode: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Subject Name</Label><Input className="rounded-xl" value={form.subjectName} onChange={(e) => setForm((prev) => ({ ...prev, subjectName: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Title on Transcript</Label><Input className="rounded-xl" value={form.titleOnTranscript} onChange={(e) => setForm((prev) => ({ ...prev, titleOnTranscript: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Theory Hours / Week</Label><Input className="rounded-xl" type="number" min="0" step="0.5" value={form.thHours} onChange={(e) => setForm((prev) => ({ ...prev, thHours: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Practical Hours / Week</Label><Input className="rounded-xl" type="number" min="0" step="0.5" value={form.prHours} onChange={(e) => setForm((prev) => ({ ...prev, prHours: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Theory Credits</Label><Input className="rounded-xl" type="number" min="0" step="0.5" value={form.thCredits} onChange={(e) => setForm((prev) => ({ ...prev, thCredits: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Practical Credits</Label><Input className="rounded-xl" type="number" min="0" step="0.5" value={form.prCredits} onChange={(e) => setForm((prev) => ({ ...prev, prCredits: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Theory Component</Label>
              <Select value={form.hasTheory} onValueChange={(value) => setForm((prev) => ({ ...prev, hasTheory: value }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Practical Component</Label>
              <Select value={form.hasPractical} onValueChange={(value) => setForm((prev) => ({ ...prev, hasPractical: value }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject Type</Label>
              <Select value={form.isElective} onValueChange={(value) => setForm((prev) => ({ ...prev, isElective: value }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="false">Core</SelectItem><SelectItem value="true">Elective</SelectItem></SelectContent>
              </Select>
            </div>
            {form.isElective === "true" && (() => {
              const electiveProgram = versionInfo.programCode || versionInfo.programName || versionInfo.program || "";
              const options = getElectiveOptions(electiveProgram, { name: form.subjectName, subjectName: form.subjectName });
              if (!options.length) return null;

              return (
              <div className="space-y-2">
                <Label>Elective Options</Label>
                <Select
                  onValueChange={(value) => {
                    const option = options.find((item) => item.value === value);
                    if (option) {
                      setForm((prev) => ({
                        ...prev,
                        subjectCode: option.value,
                        subjectName: option.label,
                        titleOnTranscript: option.label,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select elective from preset" /></SelectTrigger>
                  <SelectContent className="w-90">
                    <SelectItem value="">-- Manual Entry --</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.active} onValueChange={(value) => setForm((prev) => ({ ...prev, active: value }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={saveSubject} disabled={saving || locked}>
              {saving ? "Saving..." : form.id ? "Save Changes" : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
