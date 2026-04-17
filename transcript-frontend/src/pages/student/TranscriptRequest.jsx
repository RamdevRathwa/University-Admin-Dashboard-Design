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
const ALL_COUNTRIES = [
  { id: "AF", name: "Afghanistan" },
  { id: "AX", name: "Aland Islands" },
  { id: "AL", name: "Albania" },
  { id: "DZ", name: "Algeria" },
  { id: "AS", name: "American Samoa" },
  { id: "AD", name: "Andorra" },
  { id: "AO", name: "Angola" },
  { id: "AI", name: "Anguilla" },
  { id: "AQ", name: "Antarctica" },
  { id: "AG", name: "Antigua and Barbuda" },
  { id: "AR", name: "Argentina" },
  { id: "AM", name: "Armenia" },
  { id: "AW", name: "Aruba" },
  { id: "AU", name: "Australia" },
  { id: "AT", name: "Austria" },
  { id: "AZ", name: "Azerbaijan" },
  { id: "BS", name: "Bahamas" },
  { id: "BH", name: "Bahrain" },
  { id: "BD", name: "Bangladesh" },
  { id: "BB", name: "Barbados" },
  { id: "BY", name: "Belarus" },
  { id: "BE", name: "Belgium" },
  { id: "BZ", name: "Belize" },
  { id: "BJ", name: "Benin" },
  { id: "BM", name: "Bermuda" },
  { id: "BT", name: "Bhutan" },
  { id: "BO", name: "Bolivia" },
  { id: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { id: "BA", name: "Bosnia and Herzegovina" },
  { id: "BW", name: "Botswana" },
  { id: "BV", name: "Bouvet Island" },
  { id: "BR", name: "Brazil" },
  { id: "IO", name: "British Indian Ocean Territory" },
  { id: "BN", name: "Brunei Darussalam" },
  { id: "BG", name: "Bulgaria" },
  { id: "BF", name: "Burkina Faso" },
  { id: "BI", name: "Burundi" },
  { id: "CV", name: "Cabo Verde" },
  { id: "KH", name: "Cambodia" },
  { id: "CM", name: "Cameroon" },
  { id: "CA", name: "Canada" },
  { id: "KY", name: "Cayman Islands" },
  { id: "CF", name: "Central African Republic" },
  { id: "TD", name: "Chad" },
  { id: "CL", name: "Chile" },
  { id: "CN", name: "China" },
  { id: "CX", name: "Christmas Island" },
  { id: "CC", name: "Cocos (Keeling) Islands" },
  { id: "CO", name: "Colombia" },
  { id: "KM", name: "Comoros" },
  { id: "CG", name: "Congo" },
  { id: "CD", name: "Congo, Democratic Republic of the" },
  { id: "CK", name: "Cook Islands" },
  { id: "CR", name: "Costa Rica" },
  { id: "CI", name: "Cote d'Ivoire" },
  { id: "HR", name: "Croatia" },
  { id: "CU", name: "Cuba" },
  { id: "CW", name: "Curacao" },
  { id: "CY", name: "Cyprus" },
  { id: "CZ", name: "Czechia" },
  { id: "DK", name: "Denmark" },
  { id: "DJ", name: "Djibouti" },
  { id: "DM", name: "Dominica" },
  { id: "DO", name: "Dominican Republic" },
  { id: "EC", name: "Ecuador" },
  { id: "EG", name: "Egypt" },
  { id: "SV", name: "El Salvador" },
  { id: "GQ", name: "Equatorial Guinea" },
  { id: "ER", name: "Eritrea" },
  { id: "EE", name: "Estonia" },
  { id: "SZ", name: "Eswatini" },
  { id: "ET", name: "Ethiopia" },
  { id: "FK", name: "Falkland Islands" },
  { id: "FO", name: "Faroe Islands" },
  { id: "FJ", name: "Fiji" },
  { id: "FI", name: "Finland" },
  { id: "FR", name: "France" },
  { id: "GF", name: "French Guiana" },
  { id: "PF", name: "French Polynesia" },
  { id: "TF", name: "French Southern Territories" },
  { id: "GA", name: "Gabon" },
  { id: "GM", name: "Gambia" },
  { id: "GE", name: "Georgia" },
  { id: "DE", name: "Germany" },
  { id: "GH", name: "Ghana" },
  { id: "GI", name: "Gibraltar" },
  { id: "GR", name: "Greece" },
  { id: "GL", name: "Greenland" },
  { id: "GD", name: "Grenada" },
  { id: "GP", name: "Guadeloupe" },
  { id: "GU", name: "Guam" },
  { id: "GT", name: "Guatemala" },
  { id: "GG", name: "Guernsey" },
  { id: "GN", name: "Guinea" },
  { id: "GW", name: "Guinea-Bissau" },
  { id: "GY", name: "Guyana" },
  { id: "HT", name: "Haiti" },
  { id: "HM", name: "Heard Island and McDonald Islands" },
  { id: "VA", name: "Holy See" },
  { id: "HN", name: "Honduras" },
  { id: "HK", name: "Hong Kong" },
  { id: "HU", name: "Hungary" },
  { id: "IS", name: "Iceland" },
  { id: "IN", name: "India" },
  { id: "ID", name: "Indonesia" },
  { id: "IR", name: "Iran" },
  { id: "IQ", name: "Iraq" },
  { id: "IE", name: "Ireland" },
  { id: "IM", name: "Isle of Man" },
  { id: "IL", name: "Israel" },
  { id: "IT", name: "Italy" },
  { id: "JM", name: "Jamaica" },
  { id: "JP", name: "Japan" },
  { id: "JE", name: "Jersey" },
  { id: "JO", name: "Jordan" },
  { id: "KZ", name: "Kazakhstan" },
  { id: "KE", name: "Kenya" },
  { id: "KI", name: "Kiribati" },
  { id: "KP", name: "Korea, Democratic People's Republic of" },
  { id: "KR", name: "Korea, Republic of" },
  { id: "KW", name: "Kuwait" },
  { id: "KG", name: "Kyrgyzstan" },
  { id: "LA", name: "Lao People's Democratic Republic" },
  { id: "LV", name: "Latvia" },
  { id: "LB", name: "Lebanon" },
  { id: "LS", name: "Lesotho" },
  { id: "LR", name: "Liberia" },
  { id: "LY", name: "Libya" },
  { id: "LI", name: "Liechtenstein" },
  { id: "LT", name: "Lithuania" },
  { id: "LU", name: "Luxembourg" },
  { id: "MO", name: "Macao" },
  { id: "MG", name: "Madagascar" },
  { id: "MW", name: "Malawi" },
  { id: "MY", name: "Malaysia" },
  { id: "MV", name: "Maldives" },
  { id: "ML", name: "Mali" },
  { id: "MT", name: "Malta" },
  { id: "MH", name: "Marshall Islands" },
  { id: "MQ", name: "Martinique" },
  { id: "MR", name: "Mauritania" },
  { id: "MU", name: "Mauritius" },
  { id: "YT", name: "Mayotte" },
  { id: "MX", name: "Mexico" },
  { id: "FM", name: "Micronesia" },
  { id: "MD", name: "Moldova" },
  { id: "MC", name: "Monaco" },
  { id: "MN", name: "Mongolia" },
  { id: "ME", name: "Montenegro" },
  { id: "MS", name: "Montserrat" },
  { id: "MA", name: "Morocco" },
  { id: "MZ", name: "Mozambique" },
  { id: "MM", name: "Myanmar" },
  { id: "NA", name: "Namibia" },
  { id: "NR", name: "Nauru" },
  { id: "NP", name: "Nepal" },
  { id: "NL", name: "Netherlands" },
  { id: "NC", name: "New Caledonia" },
  { id: "NZ", name: "New Zealand" },
  { id: "NI", name: "Nicaragua" },
  { id: "NE", name: "Niger" },
  { id: "NG", name: "Nigeria" },
  { id: "NU", name: "Niue" },
  { id: "NF", name: "Norfolk Island" },
  { id: "MK", name: "North Macedonia" },
  { id: "MP", name: "Northern Mariana Islands" },
  { id: "NO", name: "Norway" },
  { id: "OM", name: "Oman" },
  { id: "PK", name: "Pakistan" },
  { id: "PW", name: "Palau" },
  { id: "PS", name: "Palestine, State of" },
  { id: "PA", name: "Panama" },
  { id: "PG", name: "Papua New Guinea" },
  { id: "PY", name: "Paraguay" },
  { id: "PE", name: "Peru" },
  { id: "PH", name: "Philippines" },
  { id: "PN", name: "Pitcairn" },
  { id: "PL", name: "Poland" },
  { id: "PT", name: "Portugal" },
  { id: "PR", name: "Puerto Rico" },
  { id: "QA", name: "Qatar" },
  { id: "RE", name: "Reunion" },
  { id: "RO", name: "Romania" },
  { id: "RU", name: "Russian Federation" },
  { id: "RW", name: "Rwanda" },
  { id: "BL", name: "Saint Barthelemy" },
  { id: "SH", name: "Saint Helena, Ascension and Tristan da Cunha" },
  { id: "KN", name: "Saint Kitts and Nevis" },
  { id: "LC", name: "Saint Lucia" },
  { id: "MF", name: "Saint Martin (French part)" },
  { id: "PM", name: "Saint Pierre and Miquelon" },
  { id: "VC", name: "Saint Vincent and the Grenadines" },
  { id: "WS", name: "Samoa" },
  { id: "SM", name: "San Marino" },
  { id: "ST", name: "Sao Tome and Principe" },
  { id: "SA", name: "Saudi Arabia" },
  { id: "SN", name: "Senegal" },
  { id: "RS", name: "Serbia" },
  { id: "SC", name: "Seychelles" },
  { id: "SL", name: "Sierra Leone" },
  { id: "SG", name: "Singapore" },
  { id: "SX", name: "Sint Maarten (Dutch part)" },
  { id: "SK", name: "Slovakia" },
  { id: "SI", name: "Slovenia" },
  { id: "SB", name: "Solomon Islands" },
  { id: "SO", name: "Somalia" },
  { id: "ZA", name: "South Africa" },
  { id: "GS", name: "South Georgia and the South Sandwich Islands" },
  { id: "SS", name: "South Sudan" },
  { id: "ES", name: "Spain" },
  { id: "LK", name: "Sri Lanka" },
  { id: "SD", name: "Sudan" },
  { id: "SR", name: "Suriname" },
  { id: "SJ", name: "Svalbard and Jan Mayen" },
  { id: "SE", name: "Sweden" },
  { id: "CH", name: "Switzerland" },
  { id: "SY", name: "Syrian Arab Republic" },
  { id: "TW", name: "Taiwan" },
  { id: "TJ", name: "Tajikistan" },
  { id: "TZ", name: "Tanzania" },
  { id: "TH", name: "Thailand" },
  { id: "TL", name: "Timor-Leste" },
  { id: "TG", name: "Togo" },
  { id: "TK", name: "Tokelau" },
  { id: "TO", name: "Tonga" },
  { id: "TT", name: "Trinidad and Tobago" },
  { id: "TN", name: "Tunisia" },
  { id: "TR", name: "Turkey" },
  { id: "TM", name: "Turkmenistan" },
  { id: "TC", name: "Turks and Caicos Islands" },
  { id: "TV", name: "Tuvalu" },
  { id: "UG", name: "Uganda" },
  { id: "UA", name: "Ukraine" },
  { id: "AE", name: "United Arab Emirates" },
  { id: "GB", name: "United Kingdom" },
  { id: "UK", name: "United Kingdom" },
  { id: "US", name: "United States" },
  { id: "UM", name: "United States Minor Outlying Islands" },
  { id: "UY", name: "Uruguay" },
  { id: "UZ", name: "Uzbekistan" },
  { id: "VU", name: "Vanuatu" },
  { id: "VE", name: "Venezuela" },
  { id: "VN", name: "Viet Nam" },
  { id: "VG", name: "Virgin Islands, British" },
  { id: "VI", name: "Virgin Islands, U.S." },
  { id: "WF", name: "Wallis and Futuna" },
  { id: "EH", name: "Western Sahara" },
  { id: "YE", name: "Yemen" },
  { id: "ZM", name: "Zambia" },
  { id: "ZW", name: "Zimbabwe" },
];

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
  const [draftRequestId, setDraftRequestId] = useState("");
  const [savingSemesters, setSavingSemesters] = useState({});
  const [savedMarksheetsBySemester, setSavedMarksheetsBySemester] = useState({});

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

  const draftRequestStorageKey = `${draftStorageKey}:requestId`;

  const getSemesterFromName = (name) => {
    const match = /^semester\s+(\d+)\s*-/i.exec(String(name || "").trim());
    return match ? Number(match[1]) : null;
  };

  const mapSavedMarksheetDocs = (docs) => {
    const next = {};
    (docs || [])
      .filter((d) => String(d?.type || d?.documentType || "").toLowerCase() === "marksheet")
      .forEach((d) => {
        const id = d?.id || d?.Id || "";
        const fileName = d?.fileName || "";
        const status = String(d?.status || "");
        const semester = getSemesterFromName(fileName);
        if (!semester) return;

        const uploadedAt = d?.uploadedAt || null;
        const prev = next[semester];
        if (!prev || (uploadedAt && prev.uploadedAt && new Date(uploadedAt).getTime() > new Date(prev.uploadedAt).getTime()) || (!prev.uploadedAt && uploadedAt)) {
          next[semester] = { id, fileName, uploadedAt, status };
        }
      });
    return next;
  };

  const getMarksheetStatusMeta = (file, isSaving) => {
    if (isSaving) return { label: "Uploading", variant: "warning" };
    if (!file) return { label: "Not Uploaded", variant: "neutral" };
    if (file instanceof File) return { label: "Selected", variant: "default" };

    const rawStatus = String(file?.status || "").toLowerCase();
    if (rawStatus === "returned") return { label: "Returned", variant: "destructive" };
    if (rawStatus === "approved") return { label: "Verified", variant: "success" };

    // Newly uploaded marksheets are persisted as Pending on the backend.
    return { label: "Uploaded", variant: "success" };
  };

  const getPersistedMarksheet = (semester) => documents.marksheetsBySemester?.[semester] || savedMarksheetsBySemester?.[semester] || null;

  const downloadPersistedFile = async (doc, fallbackName) => {
    if (!doc?.id) return;

    const { blob, fileName } = await studentDocumentsService.download(doc.id);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName || fallbackName || doc.fileName || "document";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
  };

  const openPersistedFile = async (doc) => {
    if (!doc?.id) return;

    const { blob } = await studentDocumentsService.download(doc.id);
    const objectUrl = window.URL.createObjectURL(blob);
    const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      toast({ title: "Unable to open file", description: "Please allow pop-ups for this site to view uploaded files." });
    }
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
  };

  const refreshSavedMarksheets = async (requestId) => {
    if (!requestId) {
      setSavedMarksheetsBySemester({});
      return;
    }
    try {
      const docs = await studentDocumentsService.list(requestId);
      setSavedMarksheetsBySemester(mapSavedMarksheetDocs(docs));
    } catch {
      // ignore list failures here; upload response remains source of truth for immediate feedback
    }
  };

  const ensureWorkingRequestId = async () => {
    if (draftRequestId) return draftRequestId;

    try {
      const stored = window.localStorage.getItem(draftRequestStorageKey);
      if (stored) {
        setDraftRequestId(stored);
        return stored;
      }
    } catch {
      // ignore storage errors
    }

    const draft = await transcriptService.createDraft();
    const id = draft?.id || draft?.Id;
    if (!id) throw new Error("Unable to create draft request.");

    setDraftRequestId(id);
    try {
      window.localStorage.setItem(draftRequestStorageKey, id);
    } catch {
      // ignore storage errors
    }

    return id;
  };

  const uploadSemesterMarksheet = async (semester, file) => {
    if (!file) {
      setSavedMarksheetsBySemester((prev) => {
        const next = { ...prev };
        delete next[semester];
        return next;
      });
      return;
    }

    if (!isAllowedFile(file)) {
      setErrors((prev) => ({ ...prev, [`semester-${semester}`]: `Semester ${semester} marksheet must be PDF, JPG, JPEG, or PNG` }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, [`semester-${semester}`]: `Semester ${semester} marksheet must be 20 MB or smaller` }));
      return;
    }

    setSavingSemesters((prev) => ({ ...prev, [semester]: true }));
    setSavedMarksheetsBySemester((prev) => {
      const next = { ...prev };
      delete next[semester];
      return next;
    });

    try {
      const requestId = await ensureWorkingRequestId();
      const tagged = new File([file], `Semester ${semester} - ${file.name}`, {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
      });
      await studentDocumentsService.upload(requestId, "Marksheet", [tagged]);
      await refreshSavedMarksheets(requestId);
      setErrors((prev) => ({ ...prev, [`semester-${semester}`]: null }));
      toast({ title: `Semester ${semester} saved`, description: "Marksheet uploaded successfully." });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [`semester-${semester}`]: err?.message || `Failed to save Semester ${semester} marksheet` }));
    } finally {
      setSavingSemesters((prev) => ({ ...prev, [semester]: false }));
    }
  };

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(draftRequestStorageKey);
      if (stored) setDraftRequestId(stored);
    } catch {
      // ignore storage errors
    }
  }, [draftRequestStorageKey]);

  useEffect(() => {
    refreshSavedMarksheets(draftRequestId);
  }, [draftRequestId]);

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

  const countries = useMemo(() => ALL_COUNTRIES, []);

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
      semesterNumbers.length > 0 && semesterNumbers.every((semester) => !!getPersistedMarksheet(semester)),
      !!documents.govtId,
      authorizeRepresentative === "no" || !!documents.authorityLetter,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [authorizeRepresentative, documents.govtId, documents.authorityLetter, documents.marksheetsBySemester, semesterNumbers, savedMarksheetsBySemester]);

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
          ? Math.round((semesterNumbers.filter((semester) => !!getPersistedMarksheet(semester)).length / semesterNumbers.length) * 100)
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
    [academicCompletion, personalCompletion, documentCompletion, documents.marksheetsBySemester, savedMarksheetsBySemester, semesterNumbers]
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

    uploadSemesterMarksheet(semester, file);
  };

  const openLocalFile = (file) => {
    if (!file) return;
    const objectUrl = window.URL.createObjectURL(file);
    const win = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      toast({ title: "Unable to open file", description: "Please allow pop-ups for this site to view selected files." });
    }
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
  };

  const downloadLocalFile = (file, fallbackName) => {
    if (!file) return;
    const objectUrl = window.URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name || fallbackName || "marksheet";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
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
        else if (savingSemesters?.[semester]) next[`semester-${semester}`] = `Semester ${semester} marksheet is still saving. Please wait.`;
        else if (!savedMarksheetsBySemester?.[semester]) next[`semester-${semester}`] = `Semester ${semester} marksheet is selected but not saved yet`;
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
      const requestId = await ensureWorkingRequestId();

      const unsavedSemesters = semesterNumbers.filter((semester) => !!documents.marksheetsBySemester?.[semester] && !savedMarksheetsBySemester?.[semester]);
      for (const semester of unsavedSemesters) {
        await uploadSemesterMarksheet(semester, documents.marksheetsBySemester?.[semester]);
      }

      const marksheetErrors = getStepErrors("marksheets");
      if (Object.keys(marksheetErrors).length) {
        setErrors(marksheetErrors);
        setStep("marksheets");
        setSubmitting(false);
        return;
      }

      await studentDocumentsService.upload(requestId, "GovernmentId", documents.govtId ? [documents.govtId] : []);
      if (authorizeRepresentative === "yes" && documents.authorityLetter) {
        await studentDocumentsService.upload(requestId, "AuthorityLetter", [documents.authorityLetter]);
      }

      const submitted = await transcriptService.submitRequest(requestId);

      try {
        window.localStorage.removeItem(draftStorageKey);
        window.localStorage.removeItem(draftRequestStorageKey);
      } catch {
        // ignore storage errors
      }

      setDraftRequestId("");
      setSavedMarksheetsBySemester({});

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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = item.key === step;
              const completed = item.percent === 100;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStep(item.key)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#1e40af] bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.title}</p>
                      <p className="mt-1 text-[15px] font-semibold text-gray-900 leading-5">{item.label}</p>
                    </div>
                    <div className={`rounded-full p-2 ${active ? "bg-[#1e40af] text-white" : "bg-gray-100 text-gray-600"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-5">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      {completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
                      <span className={completed ? "text-green-700" : "text-gray-500"}>
                        {completed ? "Completed" : `${item.percent}% complete`}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{item.percent}%</span>
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
                      <p className="mt-2 text-2xl font-bold text-gray-900">{semesterNumbers.filter((semester) => !!getPersistedMarksheet(semester)).length}</p>
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
                        const file = getPersistedMarksheet(semester);
                        const errorKey = `semester-${semester}`;
                        const fileName = file?.name || file?.fileName || null;
                        const isLocalFile = file instanceof File;
                        const statusMeta = getMarksheetStatusMeta(file, !!savingSemesters[semester]);

                        return (
                          <div key={semester} className="space-y-2 rounded-xl border border-gray-200 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <Label htmlFor={`semester-${semester}`}>Semester {semester} Marksheet</Label>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                                <p className="text-xs text-gray-500">{fileName || "No file selected"}</p>
                                {file ? (
                                  <>
                                    {isLocalFile ? (
                                      <>
                                        <Button type="button" variant="outline" size="sm" onClick={() => openLocalFile(file)}>
                                          View
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadLocalFile(file, `Semester-${semester}-marksheet`)}
                                        >
                                          Download
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button type="button" variant="outline" size="sm" onClick={() => openPersistedFile(file)}>
                                          View
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadPersistedFile(file, `Semester-${semester}-marksheet`)}
                                        >
                                          Download
                                        </Button>
                                      </>
                                    )}
                                  </>
                                ) : null}
                              </div>
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
                      <p className="mt-2 text-2xl font-bold text-gray-900">{semesterNumbers.filter((semester) => !!getPersistedMarksheet(semester)).length}</p>
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
