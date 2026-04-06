import { useEffect, useMemo, useState } from "react";
import { Building2, FolderTree, Pencil, Plus, Save, Search, Trash2, Users } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";

function normalizeFacultyList(res) {
  return Array.isArray(res?.items) ? res.items : Array.isArray(res?.faculties) ? res.faculties : Array.isArray(res) ? res : [];
}

function normalizeDepartmentList(res) {
  return Array.isArray(res?.items) ? res.items : Array.isArray(res?.departments) ? res.departments : Array.isArray(res) ? res : [];
}

function iconButtonClasses(tone = "neutral") {
  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
  if (tone === "danger") {
    return `${base} border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-300`;
  }
  return `${base} border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300`;
}

export default function FacultyManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("active");
  const [hodDrafts, setHodDrafts] = useState({});
  const [savingHodId, setSavingHodId] = useState("");

  const [openFaculty, setOpenFaculty] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ id: "", code: "", name: "" });
  const [deptForm, setDeptForm] = useState({ id: "", facultyId: "", code: "", name: "", hodUserId: "" });

  const selectedFaculty = useMemo(
    () => faculties.find((item) => String(item.id || item.facultyId) === String(selectedFacultyId || "")) || null,
    [faculties, selectedFacultyId]
  );

  const filteredDepartments = useMemo(() => {
    const term = departmentSearch.trim().toLowerCase();
    return departments.filter((department) => {
      const isActive = department.active !== false;
      if (departmentFilter === "active" && !isActive) return false;
      if (departmentFilter === "inactive" && isActive) return false;

      if (!term) return true;
      const haystack = [
        department.code,
        department.deptCode,
        department.name,
        department.deptName,
        hodDrafts[String(department.id || department.departmentId)] || department.hodUserId || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [departments, departmentFilter, departmentSearch, hodDrafts]);

  const activeDepartmentCount = useMemo(
    () => departments.filter((department) => department.active !== false).length,
    [departments]
  );

  const loadFaculties = async (preserveSelection = true) => {
    const res = await adminService.listFaculties();
    const list = normalizeFacultyList(res);
    setFaculties(list);

    if (!list.length) {
      setSelectedFacultyId("");
      return list;
    }

    const previous = preserveSelection ? selectedFacultyId : "";
    const nextSelection = list.some((item) => String(item.id || item.facultyId) === String(previous || ""))
      ? previous
      : String(list[0].id || list[0].facultyId || "");

    setSelectedFacultyId(nextSelection);
    return list;
  };

  const loadDepartments = async (facultyId) => {
    if (!facultyId) {
      setDepartments([]);
      setHodDrafts({});
      return;
    }
    const res = await adminService.listDepartments(facultyId);
    const list = normalizeDepartmentList(res);
    setDepartments(list);
    setHodDrafts(
      Object.fromEntries(list.map((department) => [String(department.id || department.departmentId), department.hodUserId ? String(department.hodUserId) : ""]))
    );
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    loadFaculties(false)
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load faculties.");
        setFaculties([]);
        setSelectedFacultyId("");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadDepartments(selectedFacultyId).catch((e) => {
      if (!alive) return;
      setError(e?.message || "Failed to load departments.");
      setDepartments([]);
    });
    return () => {
      alive = false;
    };
  }, [selectedFacultyId]);

  const openNewFaculty = () => {
    setFacultyForm({ id: "", code: "", name: "" });
    setOpenFaculty(true);
  };

  const openEditFaculty = (faculty) => {
    setFacultyForm({
      id: String(faculty?.id || faculty?.facultyId || ""),
      code: faculty?.code || faculty?.facultyCode || "",
      name: faculty?.name || faculty?.facultyName || "",
    });
    setOpenFaculty(true);
  };

  const openNewDepartment = () => {
    setDeptForm({ id: "", facultyId: selectedFacultyId || "", code: "", name: "", hodUserId: "" });
    setOpenDept(true);
  };

  const openEditDepartment = (department) => {
    setDeptForm({
      id: String(department?.id || department?.departmentId || ""),
      facultyId: String(department?.facultyId || selectedFacultyId || ""),
      code: department?.code || department?.deptCode || "",
      name: department?.name || department?.deptName || "",
      hodUserId: department?.hodUserId ? String(department.hodUserId) : "",
    });
    setOpenDept(true);
  };

  const saveFaculty = async () => {
    setSaving(true);
    try {
      await adminService.upsertFaculty({
        id: facultyForm.id || undefined,
        code: facultyForm.code,
        name: facultyForm.name,
        active: true,
      });
      await loadFaculties();
      setOpenFaculty(false);
      toast({ title: facultyForm.id ? "Faculty updated" : "Faculty created" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Unable to save faculty.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDepartment = async () => {
    setSaving(true);
    try {
      await adminService.upsertDepartment({
        id: deptForm.id || undefined,
        facultyId: deptForm.facultyId || selectedFacultyId,
        code: deptForm.code,
        name: deptForm.name,
        hodUserId: deptForm.hodUserId || undefined,
        active: true,
      });
      await loadDepartments(deptForm.facultyId || selectedFacultyId);
      setOpenDept(false);
      toast({ title: deptForm.id ? "Department updated" : "Department created" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Unable to save department.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const archiveFaculty = async (faculty) => {
    const ok = window.confirm(`Remove ${faculty?.name || faculty?.facultyName || "this faculty"} from active use?`);
    if (!ok) return;

    try {
      await adminService.upsertFaculty({
        id: faculty.id || faculty.facultyId,
        code: faculty.code || faculty.facultyCode,
        name: faculty.name || faculty.facultyName,
        active: false,
      });
      await loadFaculties(false);
      toast({ title: "Faculty removed from active list" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to update faculty status.",
        variant: "destructive",
      });
    }
  };

  const archiveDepartment = async (department) => {
    const ok = window.confirm(`Remove ${department?.name || department?.deptName || "this department"} from active use?`);
    if (!ok) return;

    try {
      await adminService.upsertDepartment({
        id: department.id || department.departmentId,
        facultyId: department.facultyId || selectedFacultyId,
        code: department.code || department.deptCode,
        name: department.name || department.deptName,
        hodUserId: department.hodUserId || undefined,
        active: false,
      });
      await loadDepartments(selectedFacultyId);
      toast({ title: "Department removed from active list" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to update department status.",
        variant: "destructive",
      });
    }
  };

  const saveInlineHod = async (department) => {
    const id = String(department.id || department.departmentId || "");
    setSavingHodId(id);
    try {
      await adminService.upsertDepartment({
        id: department.id || department.departmentId,
        facultyId: department.facultyId || selectedFacultyId,
        code: department.code || department.deptCode,
        name: department.name || department.deptName,
        hodUserId: hodDrafts[id] || undefined,
        active: department.active !== false,
      });
      await loadDepartments(selectedFacultyId);
      toast({ title: "HoD assignment updated" });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Unable to update HoD assignment.",
        variant: "destructive",
      });
    } finally {
      setSavingHodId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Department Management"
        description="Manage institutional structure in a single workspace, with fast selection on the left and quick department actions on the right."
      />

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Faculties</div>
                  <div className="mt-2 text-xl font-semibold text-gray-900">{loading ? "..." : faculties.length}</div>
                </div>
                <Button type="button" size="sm" onClick={openNewFaculty} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Faculty
                </Button>
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto p-4">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                  ))}
                </div>
              ) : faculties.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No faculties yet"
                  description="Start with the first faculty so departments and programs can be grouped properly."
                  actionLabel="Add Faculty"
                  onAction={openNewFaculty}
                />
              ) : (
                <div className="space-y-3">
                  {faculties
                    .filter((faculty) => faculty.active !== false)
                    .map((faculty) => {
                      const id = String(faculty.id || faculty.facultyId || "");
                      const selected = id === String(selectedFacultyId || "");
                      return (
                        <div
                          key={id}
                          className={`rounded-2xl border p-4 shadow-sm transition ${
                            selected
                              ? "border-blue-300 bg-gradient-to-br from-blue-50 to-white ring-1 ring-blue-100"
                              : "border-gray-200 bg-white hover:-translate-y-[1px] hover:border-blue-200 hover:shadow-md"
                          }`}
                        >
                          <button type="button" onClick={() => setSelectedFacultyId(id)} className="w-full text-left">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-gray-900">
                                  {faculty.name || faculty.facultyName || "Faculty"}
                                </div>
                                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">
                                  {faculty.code || faculty.facultyCode || "No code"}
                                </div>
                              </div>
                              {selected ? <Badge className="border-blue-200 bg-blue-100 text-blue-700">Selected</Badge> : null}
                            </div>
                          </button>

                          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                            <div className="text-xs text-gray-500">Institution group</div>
                            <div className="flex items-center gap-2">
                              <button type="button" className={iconButtonClasses()} onClick={() => openEditFaculty(faculty)} title="Edit faculty">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" className={iconButtonClasses("danger")} onClick={() => archiveFaculty(faculty)} title="Delete faculty">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xl font-semibold text-gray-900">
                      {selectedFaculty?.name || selectedFaculty?.facultyName || "Departments"}
                    </div>
                    {selectedFacultyId ? (
                      <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                        {activeDepartmentCount} department{activeDepartmentCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedFacultyId
                      ? "Manage department records, assign HoD mappings inline, and keep the faculty structure tidy."
                      : "Select a faculty from the left panel to view its departments."}
                  </p>
                </div>
                <Button type="button" onClick={openNewDepartment} disabled={!selectedFacultyId} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Department
                </Button>
              </div>

              {selectedFacultyId ? (
                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={departmentSearch}
                      onChange={(e) => setDepartmentSearch(e.target.value)}
                      placeholder="Search departments, codes, or HoD mapping"
                      className="rounded-xl pl-10"
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Filter departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active only</SelectItem>
                      <SelectItem value="inactive">Inactive only</SelectItem>
                      <SelectItem value="all">All departments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="p-6">
              {!selectedFacultyId ? (
                <EmptyState
                  icon={FolderTree}
                  title="Select a faculty first"
                  description="Choose a faculty from the left panel to open its department workspace."
                />
              ) : loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
                  ))}
                </div>
              ) : filteredDepartments.length === 0 ? (
                <EmptyState
                  icon={FolderTree}
                  title={departments.length === 0 ? "No departments yet" : "No departments match this filter"}
                  description={
                    departments.length === 0
                      ? "This faculty does not have any departments yet. Add the first one to make it available across the application."
                      : "Try adjusting the search term or filter to surface the department you want."
                  }
                  actionLabel={departments.length === 0 ? "Add Department" : undefined}
                  onAction={departments.length === 0 ? openNewDepartment : undefined}
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="w-[320px]">HoD Assignment</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepartments.map((department) => {
                        const id = String(department.id || department.departmentId);
                        return (
                          <TableRow key={id} className="hover:bg-slate-50/80">
                            <TableCell className="font-medium text-gray-900">{department.code || department.deptCode || "-"}</TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-900">{department.name || department.deptName || "-"}</div>
                              <div className="mt-1 text-xs text-gray-500">Faculty scoped</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input
                                    value={hodDrafts[id] ?? ""}
                                    onChange={(e) => setHodDrafts((prev) => ({ ...prev, [id]: e.target.value }))}
                                    placeholder="Legacy HoD user GUID"
                                    className="rounded-xl pl-10"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => saveInlineHod(department)}
                                  disabled={savingHodId === id}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  {savingHodId === id ? "Saving" : "Save"}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={department.active === false ? "destructive" : "success"}>
                                {department.active === false ? "Inactive" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" className={iconButtonClasses()} onClick={() => openEditDepartment(department)} title="Edit department">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" className={iconButtonClasses("danger")} onClick={() => archiveDepartment(department)} title="Delete department">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openFaculty} onOpenChange={setOpenFaculty}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{facultyForm.id ? "Edit Faculty" : "Add Faculty"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Faculty Code</Label>
              <Input value={facultyForm.code} onChange={(e) => setFacultyForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1">
              <Label>Faculty Name</Label>
              <Input value={facultyForm.name} onChange={(e) => setFacultyForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenFaculty(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveFaculty} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Faculty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDept} onOpenChange={setOpenDept}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{deptForm.id ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Faculty</Label>
              <Input value={selectedFaculty?.name || selectedFaculty?.facultyName || ""} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Department Code</Label>
              <Input value={deptForm.code} onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1">
              <Label>Department Name</Label>
              <Input value={deptForm.name} onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>HoD User ID (optional)</Label>
              <Input value={deptForm.hodUserId} onChange={(e) => setDeptForm((prev) => ({ ...prev, hodUserId: e.target.value }))} placeholder="Legacy HoD user GUID" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenDept(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveDepartment} disabled={saving || !selectedFacultyId}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
