import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";
import { apiRequest } from "../../services/apiClient";
import { getEarnedGradePoints, getGradePoint, round2 } from "../../components/clerk/grade-entry/gradeUtils";

function computeCgpa(semesters, grades) {
  let credits = 0;
  let earned = 0;
  (semesters || []).forEach((sem, semIndex) => {
    (sem.subjects || []).forEach((s, rowIndex) => {
      const id = s.curriculumSubjectId || `${semIndex}-${rowIndex}`;
      const thCredits = Number(s.thCredits) || 0;
      const prCredits = Number(s.prCredits) || 0;
      const thGrade = grades?.[`${id}:th`] || s.thGrade || "";
      const prGrade = grades?.[`${id}:pr`] || s.prGrade || "";
      const gpTh = thCredits > 0 ? getGradePoint(thGrade) : 0;
      const gpPr = prCredits > 0 ? getGradePoint(prGrade) : 0;
      credits += thCredits + prCredits;
      earned += getEarnedGradePoints(gpTh, thCredits) + getEarnedGradePoints(gpPr, prCredits);
    });
  });
  return credits > 0 ? round2(earned / credits) : 0;
}

function computeLastSgpa(semesters, grades) {
  const sem = (semesters || []).slice(-1)[0];
  if (!sem) return 0;
  let credits = 0;
  let earned = 0;
  (sem.subjects || []).forEach((s, rowIndex) => {
    const id = s.curriculumSubjectId || `last-${rowIndex}`;
    const thCredits = Number(s.thCredits) || 0;
    const prCredits = Number(s.prCredits) || 0;
    const thGrade = grades?.[`${id}:th`] || s.thGrade || "";
    const prGrade = grades?.[`${id}:pr`] || s.prGrade || "";
    const gpTh = thCredits > 0 ? getGradePoint(thGrade) : 0;
    const gpPr = prCredits > 0 ? getGradePoint(prGrade) : 0;
    credits += thCredits + prCredits;
    earned += getEarnedGradePoints(gpTh, thCredits) + getEarnedGradePoints(gpPr, prCredits);
  });
  return credits > 0 ? round2(earned / credits) : 0;
}

export default function DeanPendingApprovals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest("/api/dean/transcript-requests/pending")
      .then(async (pending) => {
        const list = Array.isArray(pending) ? pending : [];
        if (list.length === 0) return [];
        // Hydrate list items with student + grade sheet via review endpoint.
        const enriched = await Promise.all(
          list.map(async (r) => {
            try {
              const review = await apiRequest(`/api/dean/transcript-requests/${encodeURIComponent(r.id)}/review`);
              const student = review?.gradeSheet?.student || {};
              const semesters = review?.gradeSheet?.semesters || [];
              const grades = {};
              semesters.forEach((sem) => {
                (sem.subjects || []).forEach((s) => {
                  if (!s?.curriculumSubjectId) return;
                  if (s.thCredits > 0) grades[`${s.curriculumSubjectId}:th`] = s.thGrade || "";
                  if (s.prCredits > 0) grades[`${s.curriculumSubjectId}:pr`] = s.prGrade || "";
                });
              });
              const sgpa = computeLastSgpa(semesters, grades);
              const cgpa = computeCgpa(semesters, grades);
              return {
                id: r.id,
                studentName: student.fullName || "-",
                department: student.department || "-",
                program: student.program || "-",
                sgpa,
                cgpa,
                hodApprovedAt: review?.approvals?.slice?.(-1)?.[0]?.actionAt || null,
              };
            } catch {
              return {
                id: r.id,
                studentName: "-",
                department: "-",
                program: "-",
                sgpa: 0,
                cgpa: 0,
                hodApprovedAt: null,
              };
            }
          })
        );
        return enriched;
      })
      .then((enriched) => alive && setRows(enriched))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const countLabel = useMemo(() => (loading ? "Loading..." : `${rows.length} records`), [loading, rows.length]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Final Approvals</CardTitle>
          <CardDescription>Requests forwarded to Dean for final decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 mb-3">{countLabel}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>SGPA</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>HoD Approved</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-gray-600">Loading...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">No pending approvals</p>
                    <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-900">{String(r.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.program}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.sgpa || 0).toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.cgpa || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-gray-600 tabular-nums">{r.hodApprovedAt ? new Date(r.hodApprovedAt).toLocaleString("en-IN") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status="Forwarded to Dean" />
                        <Button type="button" variant="outline" onClick={() => navigate(`/dean/review/${encodeURIComponent(r.id)}`)}>
                          Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

