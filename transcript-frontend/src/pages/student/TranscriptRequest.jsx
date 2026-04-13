import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
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
import { lookupService } from "../../services/lookupService";
import { CheckCircle2, Circle, FileCheck2, GraduationCap, UserRound } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";

const formatISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [".pdf", ".jpg", ".jpeg", ".png"];

function getFileExtension(name) {
  const raw = String(name || "").trim().toLowerCase();
  const idx = raw.lastIndexOf(".");
  return idx >= 0 ? raw.slice(idx) : "";
}

function isAllowedFile(file) {
  return ALLOWED_FILE_TYPES.includes(getFileExtension(file?.name));
}

export default function TranscriptRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const draftStorageKey = useMemo(
    () => `student-transcript-request-draft:${user?.id || user?.email || "anonymous"}`,
    [user?.email, user?.id]
  );

  const [step, setStep] = useState("academic"); // academic | personal | marksheets | identity
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
    marksheetsBySemester: {},
    govtId: null,
    authorityLetter: null,
  });
  const [authorizeRepresentative, setAuthorizeRepresentative] = useState("no");
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.facultyId === formData.faculty),
    [departments, formData.faculty]
  );

  const filteredPrograms = useMemo(
    () => programs.filter((p) => p.departmentId === formData.department),
    [programs, formData.department]
  );

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === formData.program) || null,
    [programs, formData.program]
  );

  const selectedFaculty = useMemo(
    () => faculties.find((f) => f.id === formData.faculty) || null,
    [faculties, formData.faculty]
  );

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === formData.department) || null,
    [departments, formData.department]
  );

  const selectedProgramDuration = selectedProgram?.durationYears || 0;
  const semesterNumbers = useMemo(
    () => Array.from({ length: selectedProgramDuration ? selectedProgramDuration * 2 : 0 }, (_, index) => index + 1),
    [selectedProgramDuration]
  );

  useEffect(() => {
    setDocuments((prev) => {
      if (!semesterNumbers.length) {
        return prev.marksheetsBySemester && Object.keys(prev.marksheetsBySemester).length
          ? { ...prev, marksheetsBySemester: {} }
          : prev;
      }

      const next = {};
      semesterNumbers.forEach((semester) => {
        next[semester] = prev.marksheetsBySemester?.[semester] || null;
      });

      return { ...prev, marksheetsBySemester: next };
    });
  }, [semesterNumbers]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => String(currentYear - i));
  }, []);

  const academicYearOptions = useMemo(() => {
    if (!selectedProgramDuration) return [];
    return yearOptions.map((startYear) => {
      const start = Number(startYear);
      const end = start + selectedProgramDuration;
      return {
        value: String(start),
        label: `${start}-${end}`,
      };
    });
  }, [selectedProgramDuration, yearOptions]);

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

  const academicCompletion = useMemo(() => {
    const checks = [
      !!String(formData.prn || "").trim(),
      !!formData.faculty,
      !!formData.department,
      !!formData.program,
      !!formData.admissionYear && !!formData.graduationYear,
      !!selectedProgramDuration,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [formData, selectedProgramDuration]);

  const personalCompletion = useMemo(() => {
    const checks = [
      !!formData.nationality,
      !!formData.dob,
      !!String(formData.birthPlace || "").trim(),
      !!String(formData.address || "").trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [formData]);

  const documentCompletion = useMemo(() => {
    const checks = [
      semesterNumbers.length > 0 && semesterNumbers.every((semester) => !!documents.marksheetsBySemester?.[semester]),
      !!documents.govtId,
      authorizeRepresentative === "no" || !!documents.authorityLetter,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [authorizeRepresentative, documents, semesterNumbers]);

  const overallCompletion = useMemo(() => {
    return Math.round((academicCompletion + personalCompletion + documentCompletion) / 3);
  }, [academicCompletion, personalCompletion, documentCompletion]);

  const steps = useMemo(
    () => [
      {
        key: "academic",
        title: "Step 1",
        label: "Academic Information",
        description: "Confirm PRN, faculty, department, program, and academic years.",
        percent: academicCompletion,
        icon: GraduationCap,
      },
      {
        key: "personal",
        title: "Step 2",
        label: "Personal Details",
        description: "Complete nationality, date of birth, birth place, and address.",
        percent: personalCompletion,
        icon: UserRound,
      },
      {
        key: "marksheets",
        title: "Step 3",
        label: "Semester Marksheet Uploads",
        description: "Upload one marksheet for each semester in your program.",
        percent: semesterNumbers.length
          ? Math.round((semesterNumbers.filter((semester) => !!documents.marksheetsBySemester?.[semester]).length / semesterNumbers.length) * 100)
          : 0,
        icon: FileCheck2,
      },
      {
        key: "identity",
        title: "Step 4",
        label: "Identity Documents",
        description: "Upload your government ID and authority letter only if applicable.",
        percent: documentCompletion,
        icon: FileCheck2,
      },
    ],
    [academicCompletion, personalCompletion, documentCompletion, documents.marksheetsBySemester, semesterNumbers]
  );

  const currentStepIndex = steps.findIndex((item) => item.key === step);

  const buildProfileDto = () => ({
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
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.formData) {
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
      }
      if (parsed?.authorizeRepresentative === "yes" || parsed?.authorizeRepresentative === "no") {
        setAuthorizeRepresentative(parsed.authorizeRepresentative);
      }
      if (["academic", "personal", "marksheets", "identity"].includes(parsed?.step)) {
        setStep(parsed.step);
      }
    } catch {
      // ignore invalid local draft
    }
  }, [draftStorageKey]);

  useEffect(() => {
    let cancelled = false;

    const loadFaculties = async () => {
      try {
        const res = await lookupService.listFaculties();
        if (cancelled) return;
        setFaculties(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (cancelled) return;
        setFaculties([]);
      }
    };

    loadFaculties();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      if (!formData.faculty) {
        setDepartments([]);
        return;
      }

      try {
        const res = await lookupService.listDepartments(formData.faculty);
        if (cancelled) return;
        setDepartments(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (cancelled) return;
        setDepartments([]);
      }
    };

    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [formData.faculty]);

  useEffect(() => {
    let cancelled = false;

    const loadPrograms = async () => {
      if (!formData.department) {
        setPrograms([]);
        return;
      }

      try {
        const res = await lookupService.listPrograms(formData.department);
        if (cancelled) return;
        setPrograms(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (cancelled) return;
        setPrograms([]);
      }
    };

    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [formData.department]);

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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          formData,
          authorizeRepresentative,
          step,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [authorizeRepresentative, draftStorageKey, formData, step]);

  const setField = (name, value) => {
    setFormData((p) => {
      const next = { ...p, [name]: value };
      if (name === "faculty") {
        next.department = "";
        next.program = "";
        next.admissionYear = "";
        next.graduationYear = "";
      }
      if (name === "department") {
        next.program = "";
        next.admissionYear = "";
        next.graduationYear = "";
      }
      if (name === "program") {
        next.admissionYear = "";
        next.graduationYear = "";
      }
      return next;
    });
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const setDoc = (name, value) => {
    setDocuments((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const setSemesterMarksheet = (semester, file) => {
    setDocuments((p) => ({
      ...p,
      marksheetsBySemester: {
        ...p.marksheetsBySemester,
        [semester]: file,
      },
    }));
    const key = `semester-${semester}`;
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const getStepErrors = (s) => {
    const next = {};
    if (s === "academic") {
      const prn = String(formData.prn || "").trim();
      if (!prn) next.prn = "PRN is required";
      else if (!/^\d{10}$/.test(prn)) next.prn = "PRN must be exactly 10 digits";
      if (!formData.faculty) next.faculty = "Select a faculty";
      if (!formData.department) next.department = "Select a department";
      if (!formData.program) next.program = "Select a program";
      if (!formData.admissionYear) next.admissionYear = "Academic year is required";
      if (!formData.graduationYear) next.admissionYear = "Select a valid academic year";
    }
    if (s === "personal") {
      if (!formData.nationality) next.nationality = "Nationality is required";
      if (!formData.dob) next.dob = "Date of birth is required";
      else {
        const dob = new Date(formData.dob);
        const today = new Date();
        if (Number.isNaN(dob.getTime())) next.dob = "Enter a valid date of birth";
        else if (dob > today) next.dob = "Date of birth cannot be in the future";
      }

      const birthPlace = String(formData.birthPlace || "").trim();
      if (!birthPlace) next.birthPlace = "Birth place is required";
      else if (birthPlace.length < 2) next.birthPlace = "Birth place is too short";

      const address = String(formData.address || "").trim();
      if (!address) next.address = "Permanent address is required";
      else if (address.length < 10) next.address = "Permanent address is too short";
    }
    if (s === "marksheets") {
      if (!semesterNumbers.length) next.marksheets = "Select a program first";
      semesterNumbers.forEach((semester) => {
        const file = documents.marksheetsBySemester?.[semester];
        if (!file) next[`semester-${semester}`] = `Upload Semester ${semester} marksheet`;
        else if (!isAllowedFile(file)) next[`semester-${semester}`] = `Semester ${semester} marksheet must be PDF, JPG, JPEG, or PNG`;
        else if (file.size > MAX_FILE_SIZE) next[`semester-${semester}`] = `Semester ${semester} marksheet must be 20 MB or smaller`;
      });
    }
    if (s === "identity") {
      if (!documents.govtId) next.govtId = "Government ID is required";
      else if (!isAllowedFile(documents.govtId)) next.govtId = "Government ID must be PDF, JPG, JPEG, or PNG";
      else if (documents.govtId.size > MAX_FILE_SIZE) next.govtId = "Government ID file must be 20 MB or smaller";

      if (authorizeRepresentative === "yes") {
        if (!documents.authorityLetter) next.authorityLetter = "Authority letter is required when you authorize someone";
        else if (!isAllowedFile(documents.authorityLetter)) next.authorityLetter = "Authority letter must be PDF, JPG, JPEG, or PNG";
        else if (documents.authorityLetter.size > MAX_FILE_SIZE) next.authorityLetter = "Authority letter file must be 20 MB or smaller";
      }
    }
    return next;
  };

  const goNext = async () => {
    const nextErrors = getStepErrors(step);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (step === "academic" || step === "personal") {
      try {
        await studentProfileService.upsertMyProfile(buildProfileDto());
        toast({ title: "Progress saved", description: `${step === "academic" ? "Academic information" : "Personal details"} saved successfully.` });
      } catch (err) {
        setErrors({ submit: err?.message || "Failed to save your progress." });
        return;
      }
    }

    setErrors({});
    setStep((p) => (p === "academic" ? "personal" : p === "personal" ? "marksheets" : p === "marksheets" ? "identity" : "identity"));
  };

  const goPrev = () => {
    setErrors({});
    setStep((p) => (p === "identity" ? "marksheets" : p === "marksheets" ? "personal" : p === "personal" ? "academic" : "academic"));
  };

  const submit = async (e) => {
    e.preventDefault();

    const a = getStepErrors("academic");
    const p = getStepErrors("personal");
    const m = getStepErrors("marksheets");
    const d = getStepErrors("identity");

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
    if (Object.keys(m).length) {
      setErrors(m);
      setStep("marksheets");
      return;
    }
    if (Object.keys(d).length) {
      setErrors(d);
      setStep("identity");
      return;
    }

    setSubmitting(true);

    try {
      const dto = buildProfileDto();

      await studentProfileService.upsertMyProfile(dto);
      const draft = await transcriptService.createDraft();
      const requestId = draft?.id || draft?.Id;

      const marksheetFiles = semesterNumbers
        .map((semester) => {
          const file = documents.marksheetsBySemester?.[semester];
          if (!file) return null;
          return new File([file], `Semester ${semester} - ${file.name}`, {
            type: file.type || "application/octet-stream",
            lastModified: file.lastModified || Date.now(),
          });
        })
        .filter(Boolean);

      await studentDocumentsService.upload(requestId, "Marksheet", marksheetFiles);
      await studentDocumentsService.upload(requestId, "GovernmentId", documents.govtId ? [documents.govtId] : []);
      if (authorizeRepresentative === "yes" && documents.authorityLetter) {
        await studentDocumentsService.upload(requestId, "AuthorityLetter", [documents.authorityLetter]);
      }

      const submitted = await transcriptService.submitRequest(requestId);

      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore storage errors
      }

      toast({ title: "Request submitted", description: `Reference ID: ${submitted?.id || submitted?.Id}` });
    } catch (err) {
      setErrors({ submit: err?.message || "Failed to submit transcript request." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Transcript Request"
        description="Complete each section in order and submit your transcript request once all required details are provided."
        actions={<Badge variant="default">Student Account</Badge>}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Transcript Request Form</CardTitle>
              <CardDescription>Academic details, personal information, and the required documents must be completed before submission.</CardDescription>
            </div>
            <div className="min-w-55 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#1e40af]">Overall Completion</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-2xl font-bold text-[#1e3a8a]">{overallCompletion}%</p>
                <p className="text-sm text-[#1e40af]">{currentStepIndex + 1} of {steps.length} steps</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                <div className="h-full rounded-full bg-[#1e40af] transition-all" style={{ width: `${overallCompletion}%` }} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = item.key === step;
              const completed = item.percent === 100;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStep(item.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#1e40af] bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.title}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{item.label}</p>
                    </div>
                    <div className={`rounded-full p-2 ${active ? "bg-[#1e40af] text-white" : "bg-gray-100 text-gray-600"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
                      <span className={completed ? "text-green-700" : "text-gray-500"}>
                        {completed ? "Completed" : `${item.percent}% complete`}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.percent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${completed ? "bg-green-500" : "bg-[#1e40af]"}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-6">
            {step === "academic" ? (
              <Card className="border-blue-100 bg-blue-50/40 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 1: Academic Information</CardTitle>
                  <CardDescription>Provide your program and academic timeline so the request can be mapped correctly.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="prn">PRN</Label>
                    <Input
                      id="prn"
                      value={formData.prn}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setField("prn", digitsOnly);
                      }}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter PRN"
                      aria-invalid={!!errors.prn}
                    />
                    {errors.prn ? <p className="text-xs text-red-600">{errors.prn}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Faculty</Label>
                      <Select value={formData.faculty} onValueChange={(v) => setField("faculty", v)}>
                        <SelectTrigger aria-invalid={!!errors.faculty}>
                          <SelectValue placeholder={selectedFaculty?.name || "Select faculty"} />
                        </SelectTrigger>
                        <SelectContent>
                          {faculties.map((f) => (
                            <SelectItem key={f.id} value={f.id} textValue={f.name}>
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
                          <SelectValue placeholder={selectedDepartment?.name || "Select department"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id} textValue={d.name}>
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
                          <SelectValue placeholder={selectedProgram?.name || "Select program"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map((p) => (
                          <SelectItem key={p.id} value={p.id} textValue={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.program ? <p className="text-xs text-red-600">{errors.program}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Select
                        value={formData.admissionYear}
                        onValueChange={(v) => {
                          const start = Number(v);
                          const end = start + (selectedProgramDuration || 0);
                          setField("admissionYear", v);
                          setField("graduationYear", String(end));
                        }}
                        disabled={!selectedProgramDuration}
                      >
                        <SelectTrigger aria-invalid={!!errors.admissionYear}>
                          <SelectValue placeholder={selectedProgramDuration ? "Select academic year" : "Select program first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYearOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.admissionYear ? <p className="text-xs text-red-600">{errors.admissionYear}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label>Program Duration</Label>
                      <Input value={selectedProgramDuration ? `${selectedProgramDuration} Years` : ""} placeholder="Auto calculated from program" readOnly />
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            ) : null}

            {step === "personal" ? (
              <Card className="border-blue-100 bg-blue-50/40 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 2: Personal Details</CardTitle>
                  <CardDescription>Make sure your identity and address details are complete before submission.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            ) : null}

            {step === "marksheets" ? (
              <Card className="border-blue-100 bg-blue-50/40 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 3: Semester Marksheet Uploads</CardTitle>
                  <CardDescription>Upload one marksheet file for each semester. The uploaded file name will be tagged by semester automatically.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Semester Slots</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{semesterNumbers.length}</p>
                      <p className="mt-1 text-sm text-gray-500">required marksheets</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{semesterNumbers.filter((semester) => !!documents.marksheetsBySemester?.[semester]).length}</p>
                      <p className="mt-1 text-sm text-gray-500">semester files chosen</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next Step</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">Govt ID</p>
                      <p className="mt-1 text-sm text-gray-500">separate identity upload</p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                    {semesterNumbers.length ? (
                      semesterNumbers.map((semester) => {
                        const file = documents.marksheetsBySemester?.[semester] || null;
                        const errorKey = `semester-${semester}`;

                        return (
                          <div key={semester} className="space-y-2 rounded-xl border border-gray-200 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <Label htmlFor={`semester-${semester}`}>Semester {semester} Marksheet</Label>
                              <p className="text-xs text-gray-500">{file ? file.name : "No file selected"}</p>
                            </div>
                            <Input
                              id={`semester-${semester}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setSemesterMarksheet(semester, (e.target.files && e.target.files[0]) || null)}
                            />
                            {errors[errorKey] ? <p className="text-xs text-red-600">{errors[errorKey]}</p> : null}
                          </div>
                        );
                      })
                    ) : (
                      <Alert>Select a program first to reveal the semester-wise marksheet upload slots.</Alert>
                    )}
                  </div>
                </div>
                </CardContent>
              </Card>
            ) : null}

            {step === "identity" ? (
              <Card className="border-blue-100 bg-blue-50/40 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 4: Government ID</CardTitle>
                  <CardDescription>Upload your government ID separately from the semester-wise marksheets. Add an authority letter only if someone is authorized to act on your behalf.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Marksheets</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{semesterNumbers.filter((semester) => !!documents.marksheetsBySemester?.[semester]).length}</p>
                      <p className="mt-1 text-sm text-gray-500">semester files selected</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Government ID</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{documents.govtId ? "1" : "0"}</p>
                      <p className="mt-1 text-sm text-gray-500">file selected</p>
                    </div>
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

                  <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="space-y-1">
                      <Label>Are you authorizing another person to act on your behalf?</Label>
                      <p className="text-sm text-gray-600">If you select Yes, you will need to upload an authority letter.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant={authorizeRepresentative === "no" ? "default" : "outline"}
                        onClick={() => {
                          setAuthorizeRepresentative("no");
                          setDoc("authorityLetter", null);
                        }}
                      >
                        No
                      </Button>
                      <Button
                        type="button"
                        variant={authorizeRepresentative === "yes" ? "default" : "outline"}
                        onClick={() => setAuthorizeRepresentative("yes")}
                      >
                        Yes
                      </Button>
                    </div>
                  </div>

                  {authorizeRepresentative === "yes" ? (
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
                  ) : null}
                </div>
                </CardContent>
              </Card>
            ) : null}

            {errors.submit ? <Alert variant="destructive">{errors.submit}</Alert> : null}

            <Separator />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Current progress: <span className="font-semibold text-gray-900">{steps[currentStepIndex]?.label}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={step === "academic" || submitting} onClick={goPrev}>
                  Previous
                </Button>

                {step !== "identity" ? (
                  <Button type="button" disabled={submitting} onClick={goNext}>
                    Save and Continue
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Transcript Request"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
