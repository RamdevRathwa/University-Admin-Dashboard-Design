import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import ApprovalTimeline from "../../components/approvals/ApprovalTimeline";
import StatusBadge from "../../components/approvals/StatusBadge";
import SemesterTranscriptTable from "../../components/clerk/grade-entry/SemesterTranscriptTable";
import { apiRequest } from "../../services/apiClient";

export default function HodReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);

  const [remarks, setRemarks] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [decision, setDecision] = useState(null); // Forwarded | Returned
  const [confirm, setConfirm] = useState({ open: false, action: null });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    apiRequest(`/api/hod/transcript-requests/${encodeURIComponent(id)}/review`)
      .then((d) => alive && setReview(d))
      .catch((e) => alive && setError(e?.message || "Failed to load review."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const gradeSheet = review?.gradeSheet || review?.GradeSheet;
  const student = gradeSheet?.student || gradeSheet?.Student;
  const semesters = gradeSheet?.semesters || gradeSheet?.Semesters || [];

  const grades = useMemo(() => {
    const g = {};
    (semesters || []).forEach((sem) => {
      (sem.subjects || []).forEach((s) => {
        if (!s?.curriculumSubjectId) return;
        if (Number(s.thCredits) > 0) g[`${s.curriculumSubjectId}:th`] = s.thGrade || "";
        if (Number(s.prCredits) > 0) g[`${s.curriculumSubjectId}:pr`] = s.prGrade || "";
      });
    });
    return g;
  }, [semesters]);

  const canAct = reviewed && !decision && !loading && !error;

  const openConfirm = (action) => {
    setError("");
    if (action === "Return" && !String(remarks || "").trim()) {
      setError("Remarks are required to return to Clerk.");
      return;
    }
    setConfirm({ open: true, action });
  };

  const runAction = async () => {
    const action = confirm.action;
    setConfirm({ open: false, action: null });
    setError("");

    try {
      if (action === "Forward") {
        await apiRequest(`/api/hod/transcript-requests/${encodeURIComponent(id)}/forward-to-dean`, { method: "POST", body: { remarks } });
        setDecision("Forwarded to Dean");
      } else if (action === "Return") {
        await apiRequest(`/api/hod/transcript-requests/${encodeURIComponent(id)}/return-to-clerk`, { method: "POST", body: { remarks } });
        setDecision("Returned to Clerk");
      }
    } catch (e) {
      setError(e?.message || "Action failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Transcript Request</h2>
          <p className="text-sm text-gray-500">HoD departmental approval (read-only review).</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={decision || review?.request?.status || "ForwardedToHoD"} />
          <Button variant="outline" type="button" onClick={() => navigate("/hod/pending")}>
            Back
          </Button>
        </div>
      </div>

      <ApprovalTimeline currentStage="HoD" />

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Details (Read Only)</CardTitle>
          <CardDescription>Verify request context.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : !student ? (
            <div className="text-sm text-gray-600">No student data.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label="Full Name" value={student.fullName} />
              <Info label="PRN" value={student.prn} mono />
              <Info label="Program" value={student.program} />
              <Info label="Department" value={student.department} />
              <Info label="Faculty" value={student.faculty} />
              <Info label="Email" value={student.email} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grade Sheet (Read Only)</CardTitle>
          <CardDescription>Grades cannot be edited at HoD stage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(semesters || []).length === 0 ? (
            <div className="text-sm text-gray-600">No semester data found.</div>
          ) : (
            (semesters || []).map((sem, idx) => (
              <SemesterTranscriptTable
                key={idx}
                semIndex={idx}
                program={student?.program}
                yearTitle={sem.yearTitle}
                termTitle={sem.termTitle}
                creditPointScheme={sem.creditPointScheme}
                subjects={sem.subjects}
                grades={grades}
                setGrade={() => {}}
                active={null}
                setActive={() => {}}
                cumulativeBefore={null}
                readOnly
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision</CardTitle>
          <CardDescription>Forward to Dean or return to Clerk with remarks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={!!decision}
              className="h-4 w-4 rounded border-gray-300 text-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/30"
            />
            I have reviewed the details and grade sheet.
          </label>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Remarks</div>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks (required if returning to Clerk)"
              disabled={!!decision}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <Button type="button" variant="destructive" disabled={!canAct} onClick={() => openConfirm("Return")}>
              Return to Clerk
            </Button>
            <Button type="button" className="bg-[#1e40af] hover:bg-[#1e40af]/90" disabled={!canAct} onClick={() => openConfirm("Forward")}>
              Approve and Forward to Dean
            </Button>
          </div>

          {decision ? (
            <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
              Decision recorded: {decision}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirm.open} onOpenChange={(open) => setConfirm((p) => ({ ...p, open }))}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirm.action === "Forward"
                ? "Forward this request to Dean for final approval?"
                : "Return this request to Clerk with your remarks?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm({ open: false, action: null })}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#1e40af] hover:bg-[#1e40af]/90" onClick={runAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={["text-sm font-semibold text-gray-900 mt-1", mono ? "tabular-nums" : ""].join(" ")}>
        {value || "-"}
      </div>
    </div>
  );
}
