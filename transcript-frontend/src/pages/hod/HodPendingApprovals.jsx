import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";

function buildMockPending() {
  return [
    { id: "REQ-10025", studentName: "David Bernardo", prn: "8022053249", program: "BE-CSE", semester: "Sem 2", sgpa: 7.8, cgpa: 7.95, submittedAt: "2026-02-24" },
    { id: "REQ-10024", studentName: "Riya Patel", prn: "8022053101", program: "BE-CSE", semester: "Sem 4", sgpa: 8.1, cgpa: 8.02, submittedAt: "2026-02-24" },
    { id: "REQ-10022", studentName: "Aman Shah", prn: "8022052998", program: "BE-CSE", semester: "Sem 1", sgpa: 6.9, cgpa: 6.9, submittedAt: "2026-02-23" },
  ];
}

export default function HodPendingApprovals() {
  const navigate = useNavigate();
  const [loading] = useState(false);
  const rows = useMemo(() => buildMockPending(), []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>Review grade sheets and forward approvals to Dean.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>SGPA</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.id}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell className="tabular-nums">{r.prn}</TableCell>
                  <TableCell>{r.program}</TableCell>
                  <TableCell>{r.semester}</TableCell>
                  <TableCell className="tabular-nums">{r.sgpa.toFixed(2)}</TableCell>
                  <TableCell className="tabular-nums">{r.cgpa.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-600 tabular-nums">{r.submittedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StatusBadge status="Pending" />
                      <Button type="button" variant="outline" disabled={loading} onClick={() => navigate(`/hod/review/${encodeURIComponent(r.id)}`)}>
                        Review
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

