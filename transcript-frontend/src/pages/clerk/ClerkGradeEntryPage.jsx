import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, Send, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import SemesterTranscriptTable from "../../components/clerk/grade-entry/SemesterTranscriptTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { getElectiveOptions, isElectivePlaceholder } from "../../components/clerk/grade-entry/electiveOptions";
import { clerkGradeEntryService } from "../../services/clerkGradeEntryService";
import { clerkRequestsService } from "../../services/clerkRequestsService";

function formatDob(dobValue) {
  const raw = String(dobValue || "").trim();
  if (!raw) return "";

  // Backend uses DateOnly => "YYYY-MM-DD"
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    }
  }

  // If already formatted (e.g. "22 April 2002"), keep it.
  return raw;
}

function formatJoinedCourseIn(admissionYear, semesters) {
  const year = Number(admissionYear);
  if (Number.isFinite(year) && year > 0) return `July ${year}`;

  const firstTerm = semesters.find((sem) => String(sem?.termTitle || "").trim());
  const termText = String(firstTerm?.termTitle || "");
  const yearMatch = termText.match(/\b(20\d{2})\b/);
  return yearMatch ? `July ${yearMatch[1]}` : "";
}

function formatCourseDuration(admissionYear, graduationYear, semesters) {
  const start = Number(admissionYear);
  const end = Number(graduationYear);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const years = end - start;
    return `${years} ${years === 1 ? "Year" : "Years"}`;
  }

  const semesterCount = Array.isArray(semesters) ? semesters.length : 0;
  if (semesterCount > 0) {
    const years = Math.max(1, Math.ceil(semesterCount / 2));
    return `${years} ${years === 1 ? "Year" : "Years"}`;
  }

  return "";
}

export default function ClerkGradeEntryPage() {
  const [searchParams] = useSearchParams();
  const [prn, setPrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [electiveSelections, setElectiveSelections] = useState({});
  const [readyStudents, setReadyStudents] = useState([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [readyError, setReadyError] = useState("");
  const autoLoadedRef = useRef(false);

  // Grades keyed by `${semIndex}:${rowIndex}:${part}` where part is 'th' | 'pr'
  const [grades, setGrades] = useState({});
  const [activeCell, setActiveCell] = useState(null); // { semIndex, rowIndex }
  const [errors, setErrors] = useState("");
  const [info, setInfo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  const loadByPrn = async (explicitPrn) => {
    const p = String((explicitPrn ?? prn) || "").trim();
    if (!p) {
      setErrors("PRN is required.");
      return;
    }
    setPrn(p);
    setErrors("");
    setInfo("");
    setLoading(true);
    try {
      const res = await clerkGradeEntryService.getByPrn(p);
      const s = res?.student || res?.Student;
      const sems = res?.semesters || res?.Semesters || [];

      if (!s) {
        throw new Error("Student profile not found for this PRN.");
      }

      const fullName = s.fullName || s.FullName || "";
      const program = s.program || s.Program || "";
      const admissionYear = s.admissionYear ?? s.AdmissionYear ?? "";
      const graduationYear = s.graduationYear ?? s.GraduationYear ?? "";
      const mappedSemesters = (sems || []).map((sem) => ({
        yearTitle: sem.yearTitle || sem.YearTitle || "",
        termTitle: sem.termTitle || sem.TermTitle || "",
        creditPointScheme: sem.creditPointScheme || sem.CreditPointScheme || 10,
        semesterNumber: sem.semesterNumber || sem.SemesterNumber || 0,
        summary: sem.summary || sem.Summary || null,
        subjects: (sem.subjects || sem.Subjects || []).map((sub) => ({
          curriculumSubjectId: sub.curriculumSubjectId || sub.CurriculumSubjectId,
          code: sub.subjectCode || sub.SubjectCode || "",
          name: sub.subjectName || sub.SubjectName || "",
          isElective: sub.isElective ?? sub.IsElective ?? false,
          selectedElectiveValue: sub.selectedElectiveValue || sub.SelectedElectiveValue || "",
          thHours: sub.thHours || sub.ThHours || 0,
          prHours: sub.prHours || sub.PrHours || 0,
          thCredits: sub.thCredits || sub.ThCredits || 0,
          prCredits: sub.prCredits || sub.PrCredits || 0,
          thGrade: sub.thGrade || sub.ThGrade || "",
          prGrade: sub.prGrade || sub.PrGrade || "",
          thGradePoint: sub.thGradePoint ?? sub.ThGradePoint ?? 0,
          prGradePoint: sub.prGradePoint ?? sub.PrGradePoint ?? 0,
          thEarnedGradePoints: sub.thEarnedGradePoints ?? sub.ThEarnedGradePoints ?? 0,
          prEarnedGradePoints: sub.prEarnedGradePoints ?? sub.PrEarnedGradePoints ?? 0,
          thOutOf: sub.thOutOf ?? sub.ThOutOf ?? 0,
          prOutOf: sub.prOutOf ?? sub.PrOutOf ?? 0,
        })),
      }));

      const mappedStudent = {
        name: fullName,
        prn: s.prn || s.PRN || p,
        faculty: s.faculty || s.Faculty || "",
        department: s.department || s.Department || "",
        program,
        admissionYear,
        graduationYear,
        nationality: s.nationality || s.Nationality || "",
        dob: formatDob(s.dob || s.DOB || ""),
        birthPlace: s.birthPlace || s.BirthPlace || "",
        permanentAddress: s.address || s.Address || "",
        degreeAwarded: program,
        joinedCourseIn: formatJoinedCourseIn(admissionYear, mappedSemesters),
        courseDuration: formatCourseDuration(admissionYear, graduationYear, mappedSemesters),
      };

      const nextElectives = {};
      mappedSemesters.forEach((sem) => {
        (sem.subjects || []).forEach((sub) => {
          const subjectId = sub.curriculumSubjectId;
          if (!subjectId) return;
          const options = getElectiveOptions(mappedStudent.program, sub);
          const selected = sub.selectedElectiveValue;
          if (selected && options.some((option) => option.value === selected)) {
            nextElectives[subjectId] = selected;
          }
        });
      });

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
      setElectiveSelections(nextElectives);
      setGrades(nextGrades);
      setActiveCell({ semIndex: 0, rowIndex: 0 });
      setRemarks("");

      setTimeout(() => {
        const el = document.getElementById("grade-0-0-th");
        if (el) el.focus();
      }, 0);
    } catch (e) {
      setErrors(e?.message || "Failed to load student.");
      setInfo("");
      setStudent(null);
      setSemesters([]);
      setElectiveSelections({});
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

  const onSetElectiveSelection = (subjectId, value) => {
    setElectiveSelections((prev) => ({ ...prev, [subjectId]: value }));
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

  const pendingElectiveCount = useMemo(() => {
    if (!student?.program) return 0;
    let missing = 0;
    (semesters || []).forEach((sem) => {
      (sem.subjects || []).forEach((sub) => {
        const subjectId = sub.curriculumSubjectId;
        if (!subjectId) return;
        const options = getElectiveOptions(student.program, sub);
        const elective = sub.isElective || isElectivePlaceholder(sub);
        if (!elective || options.length === 0) return;
        if (!electiveSelections?.[subjectId]) missing += 1;
      });
    });
    return missing;
  }, [electiveSelections, semesters, student?.program]);

  const canSubmitWithElectives = canSubmit && pendingElectiveCount === 0;

  const buildItemsPayload = () => {
    const items = [];
    (semesters || []).forEach((sem) => {
      (sem.subjects || []).forEach((sub) => {
        const id = sub.curriculumSubjectId;
        if (!id) return;
        items.push({
          curriculumSubjectId: id,
          thGrade: grades?.[`${id}:th`] ?? sub.thGrade ?? "",
          prGrade: grades?.[`${id}:pr`] ?? sub.prGrade ?? "",
        });
      });
    });
    return items;
  };

  const buildElectivesPayload = () =>
    Object.entries(electiveSelections || {})
      .filter(([curriculumSubjectId, selectedValue]) => curriculumSubjectId && selectedValue)
      .map(([curriculumSubjectId, selectedValue]) => ({
        curriculumSubjectId,
        selectedValue,
      }));

  useEffect(() => {
    if (!student?.prn || semesters.length === 0) return;

    const handle = window.setTimeout(async () => {
      try {
        const preview = await clerkGradeEntryService.preview(student.prn, buildItemsPayload(), buildElectivesPayload());
        const sems = preview?.semesters || preview?.Semesters || [];
        const mappedPreviewSemesters = (sems || []).map((sem) => ({
          yearTitle: sem.yearTitle || sem.YearTitle || "",
          termTitle: sem.termTitle || sem.TermTitle || "",
          creditPointScheme: sem.creditPointScheme || sem.CreditPointScheme || 10,
          semesterNumber: sem.semesterNumber || sem.SemesterNumber || 0,
          summary: sem.summary || sem.Summary || null,
          subjects: (sem.subjects || sem.Subjects || []).map((sub) => ({
            curriculumSubjectId: sub.curriculumSubjectId || sub.CurriculumSubjectId,
            code: sub.subjectCode || sub.SubjectCode || "",
            name: sub.subjectName || sub.SubjectName || "",
            isElective: sub.isElective ?? sub.IsElective ?? false,
            selectedElectiveValue: sub.selectedElectiveValue || sub.SelectedElectiveValue || "",
            thHours: sub.thHours || sub.ThHours || 0,
            prHours: sub.prHours || sub.PrHours || 0,
            thCredits: sub.thCredits || sub.ThCredits || 0,
            prCredits: sub.prCredits || sub.PrCredits || 0,
            thGrade: sub.thGrade || sub.ThGrade || "",
            prGrade: sub.prGrade || sub.PrGrade || "",
            thGradePoint: sub.thGradePoint ?? sub.ThGradePoint ?? 0,
            prGradePoint: sub.prGradePoint ?? sub.PrGradePoint ?? 0,
            thEarnedGradePoints: sub.thEarnedGradePoints ?? sub.ThEarnedGradePoints ?? 0,
            prEarnedGradePoints: sub.prEarnedGradePoints ?? sub.PrEarnedGradePoints ?? 0,
            thOutOf: sub.thOutOf ?? sub.ThOutOf ?? 0,
            prOutOf: sub.prOutOf ?? sub.PrOutOf ?? 0,
          })),
        }));
        setSemesters(mappedPreviewSemesters);
      } catch {
        // keep current values if preview fails
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [grades, electiveSelections, student?.prn]);

  const saveDraft = async () => {
    if (!student) {
      setErrors("Load a student by PRN to save draft.");
      return;
    }
    setErrors("");
    setInfo("");
    setSubmitting(true);
    try {
      await clerkGradeEntryService.saveDraft(student.prn, buildItemsPayload(), buildElectivesPayload());
      setInfo("Draft saved.");
    } catch (e) {
      setErrors(e?.message || "Failed to save draft.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setReadyLoading(true);
    setReadyError("");

    const normalizeStudents = (raw) => {
      const deduped = [];
      const seen = new Set();

      raw.forEach((item) => {
        const itemPrn = String(item?.prn || "").trim();
        if (!itemPrn || seen.has(itemPrn)) return;
        seen.add(itemPrn);
        deduped.push({
          id: item?.requestId || item?.id,
          prn: itemPrn,
          studentName: item?.studentName || "Student",
          program: item?.program || "",
          status: item?.status || "Ready",
        });
      });

      return deduped;
    };

    clerkGradeEntryService
      .ready()
      .then((data) => {
        if (!alive) return;
        const raw = Array.isArray(data?.students) ? data.students : [];
        setReadyStudents(normalizeStudents(raw));
      })
      .catch(async (e) => {
        if (!alive) return;
        if (e?.status === 404) {
          try {
            const fallback = await clerkRequestsService.queue();
            if (!alive) return;
            const raw = Array.isArray(fallback?.requests) ? fallback.requests : [];
            setReadyStudents(normalizeStudents(raw));
            setReadyError("");
            return;
          } catch (fallbackError) {
            if (!alive) return;
            setReadyError(fallbackError?.message || "Failed to load students for grade entry.");
            return;
          }
        }

        setReadyError(e?.message || "Failed to load ready students for grade entry.");
      })
      .finally(() => {
        if (alive) setReadyLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const requestedPrn = String(searchParams.get("prn") || "").trim();
    if (!requestedPrn || loading) return;
    if (student?.prn === requestedPrn) return;
    autoLoadedRef.current = true;
    loadByPrn(requestedPrn);
  }, [searchParams, loading, student?.prn]);

  useEffect(() => {
    if (autoLoadedRef.current || loading || student || readyLoading) return;
    if (readyStudents.length === 0) return;
    autoLoadedRef.current = true;
    loadByPrn(readyStudents[0].prn);
  }, [readyStudents, readyLoading, loading, student]);

  const reset = () => {
    setGrades({});
    setErrors("");
    setInfo("");
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
    if (pendingElectiveCount > 0) {
      setErrors("Please select the elective subject for all elective rows before submitting.");
      return;
    }
    setInfo("");
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    setErrors("");
    setInfo("");
    setSubmitting(true);
    try {
      await clerkGradeEntryService.submitToHod(student.prn, buildItemsPayload(), remarks, buildElectivesPayload());
      setInfo("Submitted to HoD.");
    } catch (e) {
      setErrors(e?.message || "Failed to submit to HoD.");
    } finally {
      setSubmitting(false);
    }
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ready For Grade Entry</CardTitle>
          <CardDescription>
            Verified students are listed here automatically. Select a student to load the grade entry sheet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {readyError ? <Alert variant="destructive">{readyError}</Alert> : null}
          {readyLoading ? (
            <div className="text-sm text-gray-500">Loading ready students...</div>
          ) : readyStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
              No verified students are currently ready for grade entry.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {readyStudents.map((item) => {
                const isActive = String(student?.prn || "") === item.prn;
                return (
                  <button
                    key={item.prn}
                    type="button"
                    onClick={() => loadByPrn(item.prn)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-[#1e40af] bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{item.studentName}</div>
                        <div className="mt-1 text-sm text-gray-600">PRN {item.prn}</div>
                        <div className="mt-1 text-sm text-gray-500">{item.program || "Program not set"}</div>
                      </div>
                      <Badge variant={isActive ? "default" : "neutral"}>{item.status}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
                <Button type="button" onClick={submitToHod} disabled={!canSubmitWithElectives}>
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
                        <td className="w-11 px-3 py-2 text-gray-700 tabular-nums">{r.n}</td>
                        <td className="w-70 px-3 py-2 text-gray-800">{r.label}</td>
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
            {info ? <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">{info}</Alert> : null}
            {incompleteCount > 0 ? (
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900 tabular-nums">{incompleteCount}</span> grade cells pending
              </div>
            ) : (
              <div className="text-sm font-semibold text-gray-900">All grades entered</div>
            )}
            {pendingElectiveCount > 0 ? (
              <div className="text-sm text-amber-700">
                <span className="font-semibold text-amber-800 tabular-nums">{pendingElectiveCount}</span> elective selections pending
              </div>
            ) : null}

            <div className="space-y-8">
              {semesters.map((sem, semIndex) => {
                return (
                  <SemesterTranscriptTable
                    key={`${semIndex}-${sem.termTitle}`}
                    semIndex={semIndex}
                    program={student.program}
                    yearTitle={sem.yearTitle}
                    termTitle={sem.termTitle}
                    creditPointScheme={sem.creditPointScheme}
                    subjects={sem.subjects}
                    grades={grades}
                    electiveSelections={electiveSelections}
                    setElectiveSelection={onSetElectiveSelection}
                    setGrade={onSetGrade}
                    active={activeCell}
                    setActive={setActiveCell}
                    semesterSummary={sem.summary}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No student selected</CardTitle>
            <CardDescription>Select a student from the ready list to begin grade entry.</CardDescription>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900" htmlFor="hod-remarks">
              Remarks (optional)
            </label>
            <textarea
              id="hod-remarks"
              className="min-h-24 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/30"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks for HoD (optional)"
            />
          </div>

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
