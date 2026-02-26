import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { Separator } from "../../components/ui/separator";
import { useToast } from "../../components/ui/use-toast";
import { studentProfileService } from "../../services/studentProfileService";
import { transcriptService } from "../../services/transcriptService";
import { studentDocumentsService } from "../../services/studentDocumentsService";

const formatISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function TranscriptRequest() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState("academic"); // academic | personal | documents
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    prn: "",
    faculty: "",
    department: "",
    program: "",
    admissionYear: "",
    graduationYear: "",
    nationality: "",
    dob: "",
    birthPlace: "",
    address: "",
  });

  const [documents, setDocuments] = useState({
    marksheets: [],
    govtId: null,
    authorityLetter: null,
  });

  const faculties = useMemo(
    () => [
      { id: "1", name: "Faculty of Technology and Engineering" },
      { id: "2", name: "Faculty of Management" },
      { id: "3", name: "Faculty of Science" },
      { id: "4", name: "Faculty of Arts" },
    ],
    []
  );

  const departments = useMemo(
    () => [
      { id: "1", facultyId: "1", name: "Computer Science and Engineering" },
      { id: "2", facultyId: "1", name: "Mechanical Engineering" },
      { id: "3", facultyId: "1", name: "Electrical Engineering" },
      { id: "4", facultyId: "2", name: "Business Administration" },
      { id: "5", facultyId: "2", name: "Finance" },
      { id: "6", facultyId: "3", name: "Physics" },
      { id: "7", facultyId: "3", name: "Chemistry" },
      { id: "8", facultyId: "4", name: "English Literature" },
    ],
    []
  );

  const programs = useMemo(
    () => [
      { id: "1", deptId: "1", name: "BE-CSE" },
      { id: "2", deptId: "1", name: "MCA" },
      { id: "3", deptId: "2", name: "BE-ME" },
      { id: "4", deptId: "3", name: "BE-EE" },
      { id: "5", deptId: "4", name: "BBA" },
      { id: "6", deptId: "4", name: "MBA" },
      { id: "7", deptId: "5", name: "B.Com" },
      { id: "8", deptId: "6", name: "B.Sc Physics" },
      { id: "9", deptId: "7", name: "B.Sc Chemistry" },
      { id: "10", deptId: "8", name: "BA English" },
    ],
    []
  );

  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.facultyId === formData.faculty),
    [departments, formData.faculty]
  );

  const filteredPrograms = useMemo(
    () => programs.filter((p) => p.deptId === formData.department),
    [programs, formData.department]
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => String(currentYear - i));
  }, []);

  const isValidISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());

  const countries = useMemo(
    () => [
      { id: "IN", name: "India" },
      { id: "US", name: "United States" },
      { id: "UK", name: "United Kingdom" },
      { id: "CA", name: "Canada" },
      { id: "AU", name: "Australia" },
      { id: "DE", name: "Germany" },
      { id: "FR", name: "France" },
      { id: "JP", name: "Japan" },
      { id: "CN", name: "China" },
      { id: "BR", name: "Brazil" },
      { id: "MX", name: "Mexico" },
      { id: "IT", name: "Italy" },
      { id: "ES", name: "Spain" },
      { id: "KR", name: "South Korea" },
      { id: "SG", name: "Singapore" },
    ],
    []
  );

  const nameById = (list, id) => list.find((x) => String(x.id) === String(id))?.name || "";
  const idByName = (list, name) => list.find((x) => String(x.name) === String(name))?.id || "";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const p = await studentProfileService.getMyProfile();
        if (cancelled || !p) return;

        setFormData((prev) => ({
          ...prev,
          prn: p.prn || p.PRN || prev.prn,
          faculty: idByName(faculties, p.faculty || p.Faculty) || prev.faculty,
          department: idByName(departments, p.department || p.Department) || prev.department,
          program: idByName(programs, p.program || p.Program) || prev.program,
          admissionYear: p.admissionYear?.toString?.() || p.AdmissionYear?.toString?.() || prev.admissionYear,
          graduationYear: p.graduationYear?.toString?.() || p.GraduationYear?.toString?.() || prev.graduationYear,
          nationality: idByName(countries, p.nationality || p.Nationality) || prev.nationality,
          dob: p.dob || p.DOB || prev.dob,
          birthPlace: p.birthPlace || p.BirthPlace || prev.birthPlace,
          address: p.address || p.Address || prev.address,
        }));
      } catch {
        // ignore; user may be new / profile not created yet
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [faculties, departments, programs, countries]);

  const setField = (name, value) => {
    setFormData((p) => {
      const next = { ...p, [name]: value };
      if (name === "faculty") {
        next.department = "";
        next.program = "";
      }
      if (name === "department") next.program = "";
      return next;
    });
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const setDoc = (name, value) => {
    setDocuments((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const getStepErrors = (s) => {
    const next = {};
    if (s === "academic") {
      if (!String(formData.prn || "").trim()) next.prn = "PRN is required";
      if (!formData.faculty) next.faculty = "Select a faculty";
      if (!formData.department) next.department = "Select a department";
      if (!formData.program) next.program = "Select a program";
      if (!formData.admissionYear) next.admissionYear = "Admission year is required";
      if (!formData.graduationYear) next.graduationYear = "Graduation year is required";
      if (formData.admissionYear && formData.graduationYear) {
        if (Number(formData.graduationYear) <= Number(formData.admissionYear)) next.graduationYear = "Graduation year must be after admission year";
      }
    }
    if (s === "personal") {
      if (!formData.nationality) next.nationality = "Nationality is required";
      if (!formData.dob) next.dob = "Date of birth is required";
      if (!String(formData.birthPlace || "").trim()) next.birthPlace = "Birth place is required";
      if (!String(formData.address || "").trim()) next.address = "Permanent address is required";
    }
    if (s === "documents") {
      if (!documents.marksheets || documents.marksheets.length === 0) next.marksheets = "Upload at least one marksheet";
      if (!documents.govtId) next.govtId = "Government ID is required";
      if (!documents.authorityLetter) next.authorityLetter = "Authority letter is required";
    }
    return next;
  };

  const goNext = () => {
    const nextErrors = getStepErrors(step);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((p) => (p === "academic" ? "personal" : p === "personal" ? "documents" : "documents"));
  };

  const goPrev = () => {
    setErrors({});
    setStep((p) => (p === "documents" ? "personal" : p === "personal" ? "academic" : "academic"));
  };

  const submit = async (e) => {
    e.preventDefault();

    const a = getStepErrors("academic");
    const p = getStepErrors("personal");
    const d = getStepErrors("documents");

    if (Object.keys(a).length) {
      setErrors(a);
      setStep("academic");
      return;
    }
    if (Object.keys(p).length) {
      setErrors(p);
      setStep("personal");
      return;
    }
    if (Object.keys(d).length) {
      setErrors(d);
      setStep("documents");
      return;
    }

    setSubmitting(true);

    try {
      const dto = {
        prn: String(formData.prn || "").trim(),
        faculty: nameById(faculties, formData.faculty),
        department: nameById(departments, formData.department),
        program: nameById(programs, formData.program),
        admissionYear: formData.admissionYear ? Number(formData.admissionYear) : null,
        graduationYear: formData.graduationYear ? Number(formData.graduationYear) : null,
        nationality: nameById(countries, formData.nationality),
        dob: formData.dob || null,
        birthPlace: String(formData.birthPlace || "").trim(),
        address: String(formData.address || "").trim(),
      };

      await studentProfileService.upsertMyProfile(dto);
      const draft = await transcriptService.createDraft();
      const requestId = draft?.id || draft?.Id;

      await studentDocumentsService.upload(requestId, "Marksheet", documents.marksheets || []);
      await studentDocumentsService.upload(requestId, "GovernmentId", documents.govtId ? [documents.govtId] : []);
      await studentDocumentsService.upload(requestId, "AuthorityLetter", documents.authorityLetter ? [documents.authorityLetter] : []);

      const submitted = await transcriptService.submitRequest(requestId);

      toast({ title: "Request submitted", description: `Reference ID: ${submitted?.id || submitted?.Id}` });
    } catch (err) {
      setErrors({ submit: err?.message || "Failed to submit transcript request." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Transcript Request</h1>
          <p className="text-sm text-gray-500">Complete all steps to submit your transcript request.</p>
        </div>
        <Badge variant="default">Student Account</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transcript Request Form</CardTitle>
          <CardDescription>Academic, personal details and document upload are required to submit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={step} onValueChange={setStep}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="mt-6 space-y-6">
              <TabsContent value="academic">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="prn">PRN</Label>
                    <Input id="prn" value={formData.prn} onChange={(e) => setField("prn", e.target.value)} placeholder="Enter PRN" aria-invalid={!!errors.prn} />
                    {errors.prn ? <p className="text-xs text-red-600">{errors.prn}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Faculty</Label>
                      <Select value={formData.faculty} onValueChange={(v) => setField("faculty", v)}>
                        <SelectTrigger aria-invalid={!!errors.faculty}>
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                        <SelectContent>
                          {faculties.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.faculty ? <p className="text-xs text-red-600">{errors.faculty}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={formData.department} onValueChange={(v) => setField("department", v)} disabled={!formData.faculty}>
                        <SelectTrigger aria-invalid={!!errors.department}>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.department ? <p className="text-xs text-red-600">{errors.department}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select value={formData.program} onValueChange={(v) => setField("program", v)} disabled={!formData.department}>
                      <SelectTrigger aria-invalid={!!errors.program}>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.program ? <p className="text-xs text-red-600">{errors.program}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Admission Year</Label>
                      <Select value={formData.admissionYear} onValueChange={(v) => setField("admissionYear", v)}>
                        <SelectTrigger aria-invalid={!!errors.admissionYear}>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.admissionYear ? <p className="text-xs text-red-600">{errors.admissionYear}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label>Graduation Year</Label>
                      <Select value={formData.graduationYear} onValueChange={(v) => setField("graduationYear", v)}>
                        <SelectTrigger aria-invalid={!!errors.graduationYear}>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.graduationYear ? <p className="text-xs text-red-600">{errors.graduationYear}</p> : null}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Select value={formData.nationality} onValueChange={(v) => setField("nationality", v)}>
                      <SelectTrigger aria-invalid={!!errors.nationality}>
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.nationality ? <p className="text-xs text-red-600">{errors.nationality}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={formData.dob || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setField("dob", v);
                          }}
                          aria-invalid={!!errors.dob}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="shrink-0">
                              Pick
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="end">
                            <Calendar
                              selected={isValidISODate(formData.dob) ? new Date(formData.dob) : undefined}
                              onSelect={(d) => {
                                if (!d) return;
                                const today = new Date();
                                if (d > today) return;
                                setField("dob", formatISODate(d));
                              }}
                              disabled={(d) => d > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {errors.dob ? <p className="text-xs text-red-600">{errors.dob}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthPlace">Birth Place</Label>
                      <Input id="birthPlace" value={formData.birthPlace} onChange={(e) => setField("birthPlace", e.target.value)} placeholder="Enter birth place" aria-invalid={!!errors.birthPlace} />
                      {errors.birthPlace ? <p className="text-xs text-red-600">{errors.birthPlace}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Permanent Address</Label>
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setField("address", e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2"
                      placeholder="Enter your permanent address"
                    />
                    {errors.address ? <p className="text-xs text-red-600">{errors.address}</p> : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents">
                <div className="space-y-6">
                  <Card className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Upload Documents</CardTitle>
                      <CardDescription>Upload all required documents to proceed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="marksheets">Marksheets (Multiple)</Label>
                        <Input
                          id="marksheets"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setDoc("marksheets", Array.from(e.target.files || []))}
                        />
                        {errors.marksheets ? <p className="text-xs text-red-600">{errors.marksheets}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="govtId">Government ID</Label>
                        <Input
                          id="govtId"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setDoc("govtId", (e.target.files && e.target.files[0]) || null)}
                        />
                        {errors.govtId ? <p className="text-xs text-red-600">{errors.govtId}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="authorityLetter">Authority Letter</Label>
                        <Input
                          id="authorityLetter"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setDoc("authorityLetter", (e.target.files && e.target.files[0]) || null)}
                        />
                        {errors.authorityLetter ? <p className="text-xs text-red-600">{errors.authorityLetter}</p> : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {errors.submit ? <Alert variant="destructive">{errors.submit}</Alert> : null}

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={step === "academic" || submitting} onClick={goPrev}>
                  Previous
                </Button>

                {step !== "documents" ? (
                  <Button type="button" disabled={submitting} onClick={goNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Transcript Request"}
                  </Button>
                )}
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
