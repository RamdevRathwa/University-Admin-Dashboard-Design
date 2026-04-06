import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { BookOpen, Plus } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function ProgramCurriculum() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [versions, setVersions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [gradingSchemes, setGradingSchemes] = useState([]);

  const [newProgram, setNewProgram] = useState({
    departmentId: "",
    code: "",
    name: "",
    degreeName: "",
    durationYears: 4,
    gradingSchemeId: "",
  });
  const [newVersion, setNewVersion] = useState({ academicYear: "", versionName: "", active: true });

  const programMap = useMemo(() => {
    const map = new Map();
    for (const program of programs) map.set(String(program.id || program.programId || ""), program);
    return map;
  }, [programs]);

  const departmentMap = useMemo(() => {
    const map = new Map();
    for (const department of departments) map.set(String(department.id || department.departmentId || ""), department);
    return map;
  }, [departments]);

  const loadPrograms = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listPrograms();
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.programs) ? res.programs : Array.isArray(res) ? res : [];
      setPrograms(list);
      if (!programId && list[0]) setProgramId(String(list[0].id || list[0].programId));
    } catch (e) {
      setError(e?.message || "Failed to load programs.");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProgramLookups = async () => {
    try {
      const [departmentRes, gradingRes] = await Promise.all([adminService.listDepartments(""), adminService.listGradingSchemes()]);
      const departmentList = Array.isArray(departmentRes?.items) ? departmentRes.items : Array.isArray(departmentRes) ? departmentRes : [];
      const gradingList = Array.isArray(gradingRes?.items) ? gradingRes.items : Array.isArray(gradingRes) ? gradingRes : [];
      setDepartments(departmentList);
      setGradingSchemes(gradingList);
      setNewProgram((prev) => ({
        ...prev,
        departmentId: prev.departmentId || String(departmentList[0]?.id || departmentList[0]?.departmentId || ""),
        gradingSchemeId: prev.gradingSchemeId || String(gradingList[0]?.id || ""),
      }));
    } catch (e) {
      setError((current) => current || e?.message || "Failed to load program lookups.");
    }
  };

  const loadVersions = async (pid) => {
    if (!pid) {
      setVersions([]);
      return;
    }

    setError("");
    try {
      const res = await adminService.listCurriculumVersions(pid);
      const list = Array.isArray(res?.items) ? res.items : Array.isArray(res?.versions) ? res.versions : Array.isArray(res) ? res : [];
      setVersions(list);
    } catch (e) {
      setError(e?.message || "Failed to load curriculum versions.");
      setVersions([]);
    }
  };

  useEffect(() => {
    loadPrograms();
    loadProgramLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVersions(programId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const createProgram = async () => {
    try {
      await adminService.upsertProgram(newProgram);
      toast({ title: "Program saved" });
      setNewProgram((prev) => ({
        departmentId: prev.departmentId || String(departments[0]?.id || departments[0]?.departmentId || ""),
        code: "",
        name: "",
        degreeName: "",
        durationYears: 4,
        gradingSchemeId: prev.gradingSchemeId || String(gradingSchemes[0]?.id || ""),
      }));
      await loadPrograms();
    } catch (e) {
      toast({ title: "Program could not be saved", description: e?.message || "Please review the program details and try again.", variant: "destructive" });
    }
  };

  const createVersion = async () => {
    try {
      await adminService.createCurriculumVersion(programId, newVersion);
      toast({ title: "Curriculum version created" });
      setNewVersion({ academicYear: "", versionName: "", active: true });
      await loadVersions(programId);
    } catch (e) {
      toast({ title: "Version could not be created", description: e?.message || "Please review the version details and try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Program & Curriculum"
        description="Manage programs and versioned curricula while keeping previously-used structures read-only."
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Program & Curriculum</CardTitle>
              <p className="mt-1 text-sm text-gray-500">Programs, academic-year versions, and subject structures are managed here.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <BookOpen className="h-4 w-4 text-[#1e40af]" />
              Versioned
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="versions">
            <TabsList className="rounded-xl">
              <TabsTrigger value="versions">Curriculum Versions</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <Label>Program</Label>
                  <div className="mt-1">
                    <Select value={programId || ""} onValueChange={setProgramId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={String(program.id || program.programId)} value={String(program.id || program.programId)}>
                            {program.name || program.programName || program.program_code || program.code || "Program"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 lg:col-span-7">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {programMap.get(String(programId || ""))?.name || programMap.get(String(programId || ""))?.programName || "-"}
                    </p>
                    <p className="truncate text-xs text-gray-500">Create versions per academic year and keep past versions visible.</p>
                  </div>
                  <Badge variant="secondary">Readonly once used</Badge>
                </div>
              </div>

              <Card className="rounded-xl border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Create Curriculum Version</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Academic Year</Label>
                    <Input className="rounded-xl" placeholder="2022-2026" value={newVersion.academicYear} onChange={(e) => setNewVersion((prev) => ({ ...prev, academicYear: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Version Name</Label>
                    <Input className="rounded-xl" placeholder="V1" value={newVersion.versionName} onChange={(e) => setNewVersion((prev) => ({ ...prev, versionName: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={createVersion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Version
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : versions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8">
                          <EmptyState
                            icon={BookOpen}
                            title="No curriculum versions found"
                            description="Create the first version for the selected program to start managing semester subject mappings."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      versions.map((version) => (
                        <TableRow key={String(version.id || version.versionId)} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{version.academicYear || version.year || "-"}</TableCell>
                          <TableCell>{version.versionName || version.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={version.active ? "secondary" : "outline"}>{version.active ? "Published" : "Draft"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{version.subjectCount ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() =>
                                navigate(`/admin/curriculum/${encodeURIComponent(String(version.id || version.versionId))}/subjects`, {
                                  state: {
                                    programName: programMap.get(String(programId || ""))?.name || programMap.get(String(programId || ""))?.programName || "",
                                    programCode: programMap.get(String(programId || ""))?.code || programMap.get(String(programId || ""))?.programCode || "",
                                    versionName: version.versionName || version.name || "",
                                    academicYear: version.academicYear || version.year || "",
                                  },
                                })
                              }
                            >
                              Manage Subjects
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="programs" className="space-y-4">
              <Card className="rounded-xl border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Create Program</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <div className="space-y-1 lg:col-span-3">
                    <Label>Department</Label>
                    <Select value={newProgram.departmentId || ""} onValueChange={(value) => setNewProgram((prev) => ({ ...prev, departmentId: value }))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={String(department.id || department.departmentId)} value={String(department.id || department.departmentId)}>
                            {department.name || department.deptName || department.code || "Department"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label>Program Code</Label>
                    <Input className="rounded-xl" value={newProgram.code} onChange={(e) => setNewProgram((prev) => ({ ...prev, code: e.target.value }))} />
                  </div>
                  <div className="space-y-1 lg:col-span-4">
                    <Label>Program Name</Label>
                    <Input className="rounded-xl" value={newProgram.name} onChange={(e) => setNewProgram((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <Label>Degree Name</Label>
                    <Input className="rounded-xl" value={newProgram.degreeName} onChange={(e) => setNewProgram((prev) => ({ ...prev, degreeName: e.target.value }))} />
                  </div>
                  <div className="space-y-1 lg:col-span-3">
                    <Label>Grading Scheme</Label>
                    <Select value={newProgram.gradingSchemeId || ""} onValueChange={(value) => setNewProgram((prev) => ({ ...prev, gradingSchemeId: value }))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select grading scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradingSchemes.map((scheme) => (
                          <SelectItem key={String(scheme.id)} value={String(scheme.id)}>
                            {scheme.schemeName || scheme.name || "Scheme"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label>Duration (Years)</Label>
                    <Input type="number" min="1" max="10" className="rounded-xl" value={newProgram.durationYears} onChange={(e) => setNewProgram((prev) => ({ ...prev, durationYears: Number(e.target.value) || 4 }))} />
                  </div>
                  <div className="lg:col-span-12">
                    <p className="text-xs text-gray-500">
                      Programs are created against a department and grading scheme so curriculum versions can be managed cleanly per academic year.
                    </p>
                  </div>
                  <div className="flex justify-end lg:col-span-12">
                    <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={createProgram}>
                      <Plus className="mr-2 h-4 w-4" />
                      Save Program
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Degree</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : programs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8">
                          <EmptyState
                            icon={BookOpen}
                            title="No programs found"
                            description="Create a program before adding curriculum versions and subject mappings."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      programs.map((program) => (
                        <TableRow key={String(program.id || program.programId)} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{program.code || program.programCode || program.program_code || "-"}</TableCell>
                          <TableCell>{program.name || program.programName || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {departmentMap.get(String(program.departmentId || ""))?.name || departmentMap.get(String(program.departmentId || ""))?.deptName || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{program.degreeName || program.degree_name || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{program.durationYears || program.duration_years || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
