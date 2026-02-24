import { useMemo, useState } from "react";
import { Save, Send, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import SearchBar from "../../components/clerk/SearchBar";
import SemesterTranscriptTable from "../../components/clerk/grade-entry/SemesterTranscriptTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { getEarnedGradePoints, getGradePoint, getOutOfPoints } from "../../components/clerk/grade-entry/gradeUtils";
import { clerkGradeEntryService } from "../../services/clerkGradeEntryService";

function buildMockStudent(prn) {
  return {
    name: "David Bernardo",
    prn: prn || "8022053249",
    faculty: "Technology and Engineering",
    department: "Computer Science and Engineering",
    program: "BE-CSE",
    admissionYear: "2022",
    semester: "BE-I",
    academicYear: "2025-26",

    nationality: "ANGOLANA",
    dob: "22 April 2002",
    birthPlace: "LUANDA",
    permanentAddress: "LUANDA / VIANA, LUANDA",
    degreeAwarded: "B. E. (Computer Science and Engineering)*",
    joinedCourseIn: "July 2022",
    courseDuration: "Four Years (Three Years in case of Diploma to Degree Students)",
  };
}

function buildMockSemesters() {
  return [
    {
      yearTitle: "BE-I (Computer Science and Engineering)   2022-2023",
      termTitle: "First Semester (JUL 2022 - NOV 2022)",
      creditPointScheme: 10,
      subjects: [
        { name: "Applied Physics - I", thHours: 4, prHours: 3, thCredits: 4, prCredits: 1.5 },
        { name: "Applied Mathematics-I", thHours: 4, prHours: 0, thCredits: 4, prCredits: 0 },
        { name: "Fundamentals of Civil and Environmental Engineering", thHours: 4, prHours: 2, thCredits: 4, prCredits: 1 },
        { name: "Engineering Drawing-I", thHours: 4, prHours: 2, thCredits: 4, prCredits: 1 },
        { name: "Workshop Practices", thHours: 0, prHours: 2, thCredits: 0, prCredits: 1 },
        { name: "Material Science", thHours: 4, prHours: 0, thCredits: 4, prCredits: 0 },
      ],
    },
    {
      yearTitle: "BE-I (Computer Science and Engineering)   2022-2023",
      termTitle: "Second Semester (DEC 2022 - MAY 2023)",
      creditPointScheme: 10,
      subjects: [
        { name: "Applied Physics - II", thHours: 4, prHours: 2, thCredits: 4, prCredits: 1 },
        { name: "Applied Mathematics-II", thHours: 4, prHours: 0, thCredits: 4, prCredits: 0 },
        { name: "Basic Electrical Engineering", thHours: 4, prHours: 2, thCredits: 4, prCredits: 1 },
        { name: "Programming for Problem Solving", thHours: 3, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Workshop Practices-II", thHours: 0, prHours: 2, thCredits: 0, prCredits: 1 },
        { name: "Environmental Studies", thHours: 3, prHours: 0, thCredits: 3, prCredits: 0 },
      ],
    },
    {
      yearTitle: "BE-II (Computer Science and Engineering)   2023-2024",
      termTitle: "Third Semester (JUL 2023 - NOV 2023)",
      creditPointScheme: 10,
      subjects: [
        { name: "Data Structures", thHours: 3, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Discrete Mathematics", thHours: 4, prHours: 0, thCredits: 4, prCredits: 0 },
        { name: "Digital Logic Design", thHours: 3, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Object Oriented Programming", thHours: 3, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Professional Communication", thHours: 2, prHours: 0, thCredits: 2, prCredits: 0 },
      ],
    },
    {
      yearTitle: "BE-II (Computer Science and Engineering)   2023-2024",
      termTitle: "Fourth Semester (DEC 2023 - MAY 2024)",
      creditPointScheme: 10,
      subjects: [
        { name: "Operating Systems", thHours: 4, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Design and Analysis of Algorithms", thHours: 4, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Database Systems", thHours: 4, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Computer Networks", thHours: 4, prHours: 2, thCredits: 3, prCredits: 1 },
        { name: "Software Engineering", thHours: 4, prHours: 0, thCredits: 3, prCredits: 0 },
      ],
    },
  ];
}

export default function ClerkGradeEntryPage() {
  const [prn, setPrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [semesters, setSemesters] = useState([]);

  // Grades keyed by `${semIndex}:${rowIndex}:${part}` where part is 'th' | 'pr'
  const [grades, setGrades] = useState({});
  const [activeCell, setActiveCell] = useState(null); // { semIndex, rowIndex }
  const [errors, setErrors] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadByPrn = async () => {
    const p = String(prn || "").trim();
    if (!p) {
      setErrors("PRN is required.");
      return;
    }
    setErrors("");
    setLoading(true);
    try {
      const res = await clerkGradeEntryService.getByPrn(p);
      const s = res?.student || res?.Student;
      const sems = res?.semesters || res?.Semesters || [];

      const mappedStudent = s
        ? {
            name: s.fullName || s.FullName || "",
            prn: s.prn || s.PRN || p,
            faculty: s.faculty || s.Faculty || "",
            department: s.department || s.Department || "",
            program: s.program || s.Program || "",
            admissionYear: s.admissionYear ?? s.AdmissionYear ?? "",
            graduationYear: s.graduationYear ?? s.GraduationYear ?? "",
            nationality: s.nationality || s.Nationality || "",
            dob: s.dob || s.DOB || "",
            birthPlace: s.birthPlace || s.BirthPlace || "",
            permanentAddress: s.address || s.Address || "",
            degreeAwarded: s.program ? `${s.program}*` : "",
            joinedCourseIn: s.admissionYear ? `July ${s.admissionYear}` : "",
            courseDuration: "Four Years (Three Years in case of Diploma to Degree Students)",
          }
        : buildMockStudent(p);

      const mappedSemesters = (sems || []).map((sem) => ({
        yearTitle: sem.yearTitle || sem.YearTitle || "",
        termTitle: sem.termTitle || sem.TermTitle || "",
        creditPointScheme: sem.creditPointScheme || sem.CreditPointScheme || 10,
        semesterNumber: sem.semesterNumber || sem.SemesterNumber || 0,
        subjects: (sem.subjects || sem.Subjects || []).map((sub) => ({
          curriculumSubjectId: sub.curriculumSubjectId || sub.CurriculumSubjectId,
          code: sub.subjectCode || sub.SubjectCode || "",
          name: sub.subjectName || sub.SubjectName || "",
          thHours: sub.thHours || sub.ThHours || 0,
          prHours: sub.prHours || sub.PrHours || 0,
          thCredits: sub.thCredits || sub.ThCredits || 0,
          prCredits: sub.prCredits || sub.PrCredits || 0,
          thGrade: sub.thGrade || sub.ThGrade || "",
          prGrade: sub.prGrade || sub.PrGrade || "",
        })),
      }));

      const nextGrades = {};
      mappedSemesters.forEach((sem) => {
        (sem.subjects || []).forEach((sub) => {
          if (!sub.curriculumSubjectId) return;
          if (sub.thCredits > 0 && sub.thGrade) nextGrades[`${sub.curriculumSubjectId}:th`] = sub.thGrade;
          if (sub.prCredits > 0 && sub.prGrade) nextGrades[`${sub.curriculumSubjectId}:pr`] = sub.prGrade;
        });
      });

      setStudent(mappedStudent);
      setSemesters(mappedSemesters);
      setGrades(nextGrades);
      setActiveCell({ semIndex: 0, rowIndex: 0 });

      setTimeout(() => {
        const el = document.getElementById("grade-0-0-th");
        if (el) el.focus();
      }, 0);
    } catch (e) {
      setErrors(e?.message || "Failed to load student.");
      setStudent(null);
      setSemesters([]);
      setGrades({});
    } finally {
      setLoading(false);
    }
  };

  const onSetGrade = (subjectId, part, grade) => {
    const k = `${subjectId}:${part}`;
    setGrades((prev) => ({ ...prev, [k]: grade }));
    if (errors) setErrors("");
  };

  const incompleteCount = useMemo(() => {
    const sems = Array.isArray(semesters) ? semesters : [];
    let missing = 0;
    sems.forEach((sem, semIndex) => {
      (sem.subjects || []).forEach((r, rowIndex) => {
        const thCredits = Number(r?.thCredits) || 0;
        const prCredits = Number(r?.prCredits) || 0;
        const id = r.curriculumSubjectId || `${semIndex}-${rowIndex}`;
        if (thCredits > 0 && !grades?.[`${id}:th`]) missing += 1;
        if (prCredits > 0 && !grades?.[`${id}:pr`]) missing += 1;
      });
    });
    return missing;
  }, [semesters, grades]);

  const canSubmit = student && semesters.length > 0 && incompleteCount === 0 && !submitting;

  const saveDraft = async () => {
    if (!student) {
      setErrors("Load a student by PRN to save draft.");
      return;
    }
    setErrors("");
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 650);
  };

  const reset = () => {
    setGrades({});
    setErrors("");
    setTimeout(() => {
      const el = document.getElementById("grade-0-0-th");
      if (el) el.focus();
    }, 0);
  };

  const submitToHod = async () => {
    if (!student) {
      setErrors("Load a student by PRN to submit.");
      return;
    }
    if (incompleteCount > 0) {
      setErrors("Please select grades for all subjects before submitting.");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    setErrors("");
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 900);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clerk Grade Entry</h2>
          <p className="text-sm text-gray-500">Transcript-style entry layout (semester-wise tables).</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="rounded-lg bg-blue-50 text-[#1e40af] border border-blue-200">Excel-style</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <SearchBar
            value={prn}
            onChange={(v) => {
              setPrn(v);
              if (errors) setErrors("");
            }}
            placeholder="Search by PRN (e.g. 8022053249)"
            ariaLabel="Search by PRN"
            rightSlot={
              <Button type="button" onClick={loadByPrn} disabled={loading}>
                {loading ? "Loading..." : "Fetch"}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {student ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-base">{student.name}</CardTitle>
                <CardDescription>
                  PRN <span className="font-medium text-gray-700">{student.prn}</span> | {student.program}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={reset} disabled={submitting}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button type="button" variant="outline" onClick={saveDraft} disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button type="button" onClick={submitToHod} disabled={!canSubmit}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit to HoD
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-gray-900">PERSONAL DETAILS :</div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { n: 1, label: "Permanent  Registration No.", value: student.prn },
                      { n: 2, label: "Full Name :", value: student.name?.toUpperCase?.() ? student.name.toUpperCase() : student.name },
                      { n: 3, label: "Nationality :", value: student.nationality },
                      { n: 4, label: "Date of Birth :", value: student.dob },
                      { n: 5, label: "Birth Place :", value: student.birthPlace },
                      { n: 6, label: "Permanent Address :", value: student.permanentAddress },
                      { n: 7, label: "Degree to be  Awarded :", value: student.degreeAwarded },
                      { n: 8, label: "Joined Course in:", value: student.joinedCourseIn },
                      { n: 9, label: "Course Duration:", value: student.courseDuration },
                    ].map((r) => (
                      <tr key={r.n} className="border-t border-gray-200 first:border-t-0">
                        <td className="w-[44px] px-3 py-2 text-gray-700 tabular-nums">{r.n}</td>
                        <td className="w-[280px] px-3 py-2 text-gray-800">{r.label}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{r.value || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-sm text-gray-700">
              The details of the Academic Progress Record is as under :
            </div>

            {errors ? <Alert variant="destructive">{errors}</Alert> : null}
            {incompleteCount > 0 ? (
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900 tabular-nums">{incompleteCount}</span> grade cells pending
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-900">All grades entered</div>
            )}

            <div className="space-y-8">
              {semesters.map((sem, semIndex) => {
                // Build cumulative totals progressively by reusing the hidden JSON marker isn't ideal in React;
                // keep it simple: pass cumulativeBefore computed in render order from previous semesters.
                return (
                  <SemesterTranscriptTable
                    key={`${semIndex}-${sem.termTitle}`}
                    semIndex={semIndex}
                    yearTitle={sem.yearTitle}
                    termTitle={sem.termTitle}
                    creditPointScheme={sem.creditPointScheme}
                    subjects={sem.subjects}
                    grades={grades}
                    setGrade={onSetGrade}
                    active={activeCell}
                    setActive={setActiveCell}
                    cumulativeBefore={
                      // compute cumulativeBefore by folding earlier semesters (small mock data, ok)
                      semesters.slice(0, semIndex).reduce(
                        (acc, s, si) => {
                          (s.subjects || []).forEach((r, ri) => {
                            const thHours = Number(r?.thHours) || 0;
                            const prHours = Number(r?.prHours) || 0;
                            const thCredits = Number(r?.thCredits) || 0;
                            const prCredits = Number(r?.prCredits) || 0;

                            const id = r.curriculumSubjectId || `${si}-${ri}`;
                            const gTh = grades?.[`${id}:th`] || "";
                            const gPr = grades?.[`${id}:pr`] || "";

                            // local computation in table uses the same helpers; keep minimal here.
                            // We only need cumulative inputs for CGPA row; earned points depend on grade points.
                            const gpTh = thCredits > 0 ? getGradePoint(gTh) : null;
                            const gpPr = prCredits > 0 ? getGradePoint(gPr) : null;

                            if (thCredits > 0 && gpTh !== null) acc.gpThSum += gpTh;
                            if (prCredits > 0 && gpPr !== null) acc.gpPrSum += gpPr;

                            acc.thHours += thHours;
                            acc.prHours += prHours;
                            acc.thCredits += thCredits;
                            acc.prCredits += prCredits;
                            acc.egpTh += getEarnedGradePoints(gpTh ?? 0, thCredits);
                            acc.egpPr += getEarnedGradePoints(gpPr ?? 0, prCredits);
                            acc.outTh += getOutOfPoints(thCredits, s.creditPointScheme || 10);
                            acc.outPr += getOutOfPoints(prCredits, s.creditPointScheme || 10);
                          });
                          return acc;
                        },
                        { thHours: 0, prHours: 0, thCredits: 0, prCredits: 0, gpThSum: 0, gpPrSum: 0, egpTh: 0, egpPr: 0, outTh: 0, outPr: 0 }
                      )
                    }
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No student loaded</CardTitle>
            <CardDescription>Search by PRN to begin Excel-style grade entry.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit grades to HoD?</DialogTitle>
            <DialogDescription>
              This will submit the entered grades for approval. Please confirm.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
