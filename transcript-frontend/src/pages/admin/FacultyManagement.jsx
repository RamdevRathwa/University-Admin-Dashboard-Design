import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { Plus, Building2, Save } from "lucide-react";

export default function FacultyManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyId, setFacultyId] = useState("");

  const [openFaculty, setOpenFaculty] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ code: "", name: "" });
  const [deptForm, setDeptForm] = useState({ facultyId: "", code: "", name: "", hodUserId: "" });

  const facultyMap = useMemo(() => {
    const m = new Map();
    for (const f of faculties) m.set(String(f.id || f.facultyId || ""), f);
    return m;
  }, [faculties]);

  const loadFaculties = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listFaculties();
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.faculties) ? res.faculties : Array.isArray(res) ? res : [];
      setFaculties(list);
      if (!facultyId && list[0]) setFacultyId(String(list[0].id || list[0].facultyId));
    } catch (e) {
      setError(e?.message || "Failed to load faculties.");
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (fid) => {
    if (!fid) {
      setDepartments([]);
      return;
    }
    setError("");
    try {
      const res = await adminService.listDepartments(fid);
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.departments) ? res.departments : Array.isArray(res) ? res : [];
      setDepartments(list);
    } catch (e) {
      setError(e?.message || "Failed to load departments.");
      setDepartments([]);
    }
  };

  useEffect(() => {
    loadFaculties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDepartments(facultyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId]);

  const saveFaculty = async () => {
    try {
      await adminService.upsertFaculty(facultyForm);
      toast({ title: "Faculty saved" });
      setOpenFaculty(false);
      setFacultyForm({ code: "", name: "" });
      await loadFaculties();
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to save faculty.", variant: "destructive" });
    }
  };

  const saveDept = async () => {
    try {
      await adminService.upsertDepartment(deptForm);
      toast({ title: "Department saved" });
      setOpenDept(false);
      setDeptForm({ facultyId: facultyId || "", code: "", name: "", hodUserId: "" });
      await loadDepartments(facultyId);
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Unable to save department.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Faculty & Department Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Create faculties and departments, assign HoD (when available).</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setOpenFaculty(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Faculty
              </Button>
              <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={() => { setDeptForm((p) => ({ ...p, facultyId: facultyId || "" })); setOpenDept(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Department
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <Label>Faculty</Label>
              <div className="mt-1">
                <Select value={facultyId || ""} onValueChange={(v) => setFacultyId(v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {(loading ? [] : faculties).map((f) => (
                      <SelectItem key={String(f.id || f.facultyId)} value={String(f.id || f.facultyId)}>
                        {f.name || f.facultyName || f.faculty_code || f.code || "Faculty"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-8 flex items-end">
              <div className="w-full rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="h-4 w-4 text-[#1e40af]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {facultyMap.get(String(facultyId || ""))?.name || facultyMap.get(String(facultyId || ""))?.facultyName || "—"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">Departments list below</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>HoD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    </TableRow>
                  ))
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-10">
                      No departments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d) => (
                    <TableRow key={String(d.id || d.departmentId)} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{d.code || d.deptCode || d.dept_code || "—"}</TableCell>
                      <TableCell className="text-sm">{d.name || d.deptName || d.dept_name || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{d.hodName || d.hodUserId || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openFaculty} onOpenChange={setOpenFaculty}>
        <DialogContent className="sm:max-w-[560px] rounded-xl">
          <DialogHeader>
            <DialogTitle>New Faculty</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Faculty Code</Label>
              <Input className="rounded-xl" value={facultyForm.code} onChange={(e) => setFacultyForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Faculty Name</Label>
              <Input className="rounded-xl" value={facultyForm.name} onChange={(e) => setFacultyForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpenFaculty(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={saveFaculty}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDept} onOpenChange={setOpenDept}>
        <DialogContent className="sm:max-w-[560px] rounded-xl">
          <DialogHeader>
            <DialogTitle>New Department</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Faculty</Label>
              <Input className="rounded-xl" value={String(facultyMap.get(String(facultyId || ""))?.name || "")} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Dept Code</Label>
              <Input className="rounded-xl" value={deptForm.code} onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Department Name</Label>
              <Input className="rounded-xl" value={deptForm.name} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>HoD User ID (optional)</Label>
              <Input className="rounded-xl" value={deptForm.hodUserId} onChange={(e) => setDeptForm((p) => ({ ...p, hodUserId: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpenDept(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]"
              onClick={() => saveDept({ ...deptForm, facultyId: facultyId || deptForm.facultyId })}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

