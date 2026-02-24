import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import ApprovalTimeline from "../../components/approvals/ApprovalTimeline";
import StatusBadge from "../../components/approvals/StatusBadge";
import SemesterTranscriptTable from "../../components/clerk/grade-entry/SemesterTranscriptTable";

function buildMockReview(id) {
  return {
    id,
    status: "Forwarded to Dean",
    hodApprovedAt: "2026-02-24",
    hodRemarks: "Checked grade sheet and documents. Forwarding for final approval.",
    student: {
      fullName: "David Bernardo Francisco",
      prn: "8022053249",
      department: "Computer Science and Engineering",
      program: "BE-CSE",
      semester: "Sem 2",
      sgpa: 7.8,
      cgpa: 7.95,
    },
    semesters: [
      {
        yearTitle: "BE-I (Computer Science and Engineering)   2022-2023",
        termTitle: "Second Semester (DEC 2022 - MAY 2023)",
        creditPointScheme: 10,
        subjects: [
          { curriculumSubjectId: "sub-1", subjectName: "Applied Physics - II", thHours: 4, prHours: 2, thCredits: 4, prCredits: 1 },
          { curriculumSubjectId: "sub-2", subjectName: "Applied Mathematics-II", thHours: 4, prHours: 0, thCredits: 4, prCredits: 0 },
          { curriculumSubjectId: "sub-3", subjectName: "Programming for Problem Solving", thHours: 3, prHours: 2, thCredits: 3, prCredits: 1 },
        ],
      },
    ],
    grades: {
      "sub-1:th": "A",
      "sub-1:pr": "B+",
      "sub-2:th": "A+",
      "sub-3:th": "B",
      "sub-3:pr": "A",
    },
  };
}

export default function DeanReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useMemo(() => buildMockReview(id), [id]);

  const [remarks, setRemarks] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [decision, setDecision] = useState(null); // Final Approved | Rejected | Sent Back
  const [error, setError] = useState("");

  const [confirm, setConfirm] = useState({ open: false, action: null });

  const canAct = reviewed && !decision;

  const openConfirm = (action) => {
    setError("");
    if ((action === "Reject" || action === "SendBack") && !String(remarks || "").trim()) {
      setError("Remarks are required for this action.");
      return;
    }
    setConfirm({ open: true, action });
  };

  const runAction = () => {
    const action = confirm.action;
    setConfirm({ open: false, action: null });
    if (action === "Approve") setDecision("Final Approved");
    if (action === "Reject") setDecision("Rejected");
    if (action === "SendBack") setDecision("Sent back to HoD");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Transcript</h2>
          <p className="text-sm text-gray-500">Dean can make final approval or reject / send back.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={decision || data.status} />
          <Button variant="outline" type="button" onClick={() => navigate("/dean/pending")}>
            Back
          </Button>
        </div>
      </div>

      <ApprovalTimeline currentStage="Dean" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Details (Read Only)</CardTitle>
          <CardDescription>Verify request context and summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Student Name</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{data.student.fullName}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">PRN</div>
              <div className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{data.student.prn}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Department</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{data.student.department}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Program</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{data.student.program}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grade Sheet (Read Only)</CardTitle>
          <CardDescription>Grades are locked. Review only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.semesters.map((sem, idx) => (
            <SemesterTranscriptTable
              key={idx}
              semIndex={idx}
              yearTitle={sem.yearTitle}
              termTitle={sem.termTitle}
              creditPointScheme={sem.creditPointScheme}
              subjects={sem.subjects.map((s) => ({
                curriculumSubjectId: s.curriculumSubjectId,
                subjectName: s.subjectName,
                thHours: s.thHours,
                prHours: s.prHours,
                thCredits: s.thCredits,
                prCredits: s.prCredits,
              }))}
              grades={data.grades}
              setGrade={() => {}}
              active={null}
              setActive={() => {}}
              cumulativeBefore={null}
              readOnly
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">HoD Remarks</CardTitle>
          <CardDescription>Context from HoD review.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            {data.hodRemarks || "No remarks provided."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic Summary</CardTitle>
          <CardDescription>Calculated values (read only).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">Semester</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{data.student.semester}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">SGPA</div>
              <div className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{data.student.sgpa.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-500">CGPA</div>
              <div className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{data.student.cgpa.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision</CardTitle>
          <CardDescription>Final approve, reject, or send back to HoD.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={!!decision}
              className="h-4 w-4 rounded border-gray-300 text-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]"
            />
            I have reviewed the student details, grade sheet, HoD remarks, and summary.
          </label>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Remarks</div>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks (required if rejecting or sending back)"
              disabled={!!decision}
            />
          </div>

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <Button type="button" variant="outline" disabled={!canAct} onClick={() => openConfirm("SendBack")}>
              Send Back to HoD
            </Button>
            <Button type="button" variant="destructive" disabled={!canAct} onClick={() => openConfirm("Reject")}>
              Reject
            </Button>
            <Button type="button" disabled={!canAct} onClick={() => openConfirm("Approve")}>
              Final Approve
            </Button>
          </div>

          {decision ? (
            <div className="text-sm text-gray-700">
              Decision recorded: <span className="font-semibold text-gray-900">{decision}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirm.open} onOpenChange={(v) => setConfirm((p) => ({ ...p, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action?</DialogTitle>
            <DialogDescription>
              {confirm.action === "Approve"
                ? "This will finalize approval and move the request to Admin for transcript generation."
                : confirm.action === "SendBack"
                ? "This will send the request back to HoD with your remarks."
                : "This will reject the transcript request with your remarks."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm({ open: false, action: null })}>
              Cancel
            </Button>
            <Button type="button" onClick={runAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

