import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [versions, setVersions] = useState([]);

  const [newProgram, setNewProgram] = useState({ code: "", name: "", degreeName: "", durationYears: 4, gradingSchemeId: "" });
  const [newVersion, setNewVersion] = useState({ academicYear: "", versionName: "", active: true });

  const programMap = useMemo(() => {
    const m = new Map();
    for (const p of programs) m.set(String(p.id || p.programId || ""), p);
    return m;
  }, [programs]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVersions(programId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const createProgram = async () => {
    try {
      await adminService.upsertProgram?.(newProgram);
      toast({ title: "Program saved" });
      setNewProgram({ code: "", name: "", degreeName: "", durationYears: 4, gradingSchemeId: "" });
      await loadPrograms();
    } catch (e) {
      toast({ title: "Not implemented", description: e?.message || "Backend endpoint not available yet.", variant: "destructive" });
    }
  };

  const createVersion = async () => {
    try {
      await adminService.createCurriculumVersion?.(programId, newVersion);
      toast({ title: "Curriculum version created" });
      setNewVersion({ academicYear: "", versionName: "", active: true });
      await loadVersions(programId);
    } catch (e) {
      toast({ title: "Not implemented", description: e?.message || "Backend endpoint not available yet.", variant: "destructive" });
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
              <p className="text-sm text-gray-500 mt-1">Curriculum versioning UI. Old curriculum must not be edited if used in transcripts.</p>
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-5">
                  <Label>Program</Label>
                  <div className="mt-1">
                    <Select value={programId || ""} onValueChange={setProgramId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={String(p.id || p.programId)} value={String(p.id || p.programId)}>
                            {p.name || p.programName || p.program_code || p.code || "Program"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="lg:col-span-7 rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {programMap.get(String(programId || ""))?.name || programMap.get(String(programId || ""))?.programName || "—"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">Create versions per Academic Year</p>
                  </div>
                  <Badge variant="secondary">Readonly once used</Badge>
                </div>
              </div>

              <Card className="rounded-xl border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Create Curriculum Version</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Academic Year</Label>
                    <Input className="rounded-xl" placeholder="2023-24" value={newVersion.academicYear} onChange={(e) => setNewVersion((p) => ({ ...p, academicYear: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Version Name</Label>
                    <Input className="rounded-xl" placeholder="V1" value={newVersion.versionName} onChange={(e) => setNewVersion((p) => ({ ...p, versionName: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a] w-full" onClick={createVersion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Version
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
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
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
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
                      versions.map((v) => (
                        <TableRow key={String(v.id || v.versionId)} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{v.academicYear || v.year || "—"}</TableCell>
                          <TableCell>{v.name || v.versionName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={v.active ? "secondary" : "outline"}>{v.active ? "Active" : "Inactive"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{v.subjectCount ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" className="rounded-xl" disabled>
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
                <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-3 space-y-1">
                    <Label>Program Code</Label>
                    <Input className="rounded-xl" value={newProgram.code} onChange={(e) => setNewProgram((p) => ({ ...p, code: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-5 space-y-1">
                    <Label>Program Name</Label>
                    <Input className="rounded-xl" value={newProgram.name} onChange={(e) => setNewProgram((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-4 space-y-1">
                    <Label>Degree Name</Label>
                    <Input className="rounded-xl" value={newProgram.degreeName} onChange={(e) => setNewProgram((p) => ({ ...p, degreeName: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-12 flex justify-end">
                    <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" onClick={createProgram}>
                      <Plus className="h-4 w-4 mr-2" />
                      Save Program
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Program</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : programs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8">
                          <EmptyState
                            icon={BookOpen}
                            title="No programs found"
                            description="Create a program before adding curriculum versions and subject mappings."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      programs.map((p) => (
                        <TableRow key={String(p.id || p.programId)} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{p.code || p.programCode || p.program_code || "—"}</TableCell>
                          <TableCell>{p.name || p.programName || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{p.degreeName || p.degree_name || "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600">{p.durationYears || p.duration_years || "—"}</TableCell>
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
