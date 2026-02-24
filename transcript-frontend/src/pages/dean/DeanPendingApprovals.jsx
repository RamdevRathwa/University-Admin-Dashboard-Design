import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import StatusBadge from "../../components/approvals/StatusBadge";

function buildMockPending() {
  return [
    { id: "REQ-10015", studentName: "David Bernardo", department: "CSE", program: "BE-CSE", semester: "Sem 2", sgpa: 7.8, cgpa: 7.95, hodApprovedAt: "2026-02-24" },
    { id: "REQ-10013", studentName: "Riya Patel", department: "CSE", program: "BE-CSE", semester: "Sem 4", sgpa: 8.1, cgpa: 8.02, hodApprovedAt: "2026-02-24" },
  ];
}

export default function DeanPendingApprovals() {
  const navigate = useNavigate();
  const [loading] = useState(false);
  const rows = useMemo(() => buildMockPending(), []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Final Approvals</CardTitle>
          <CardDescription>Review HoD-approved requests and make final decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>SGPA</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>HoD Approved Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.id}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell>{r.program}</TableCell>
                  <TableCell>{r.semester}</TableCell>
                  <TableCell className="tabular-nums">{r.sgpa.toFixed(2)}</TableCell>
                  <TableCell className="tabular-nums">{r.cgpa.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-600 tabular-nums">{r.hodApprovedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <StatusBadge status="Forwarded to Dean" />
                      <Button type="button" variant="outline" disabled={loading} onClick={() => navigate(`/dean/review/${encodeURIComponent(r.id)}`)}>
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

