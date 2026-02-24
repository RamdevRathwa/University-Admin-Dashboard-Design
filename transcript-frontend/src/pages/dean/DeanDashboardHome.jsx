import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import StatusBadge from "../../components/approvals/StatusBadge";

function buildMockDecisions() {
  return [
    { id: "REQ-10015", student: "David Bernardo", department: "CSE", action: "Approved", at: "2026-02-24 11:10" },
    { id: "REQ-10014", student: "Riya Patel", department: "CSE", action: "Rejected", at: "2026-02-24 10:32" },
    { id: "REQ-10011", student: "Aman Shah", department: "CSE", action: "Send back to HoD", at: "2026-02-23 18:05" },
  ];
}

export default function DeanDashboardHome() {
  const recent = useMemo(() => buildMockDecisions(), []);

  const stats = useMemo(() => {
    const pending = 4;
    const approvedToday = 2;
    const rejectedToday = 1;
    const totalApproved = 132;
    return { pending, approvedToday, rejectedToday, totalApproved };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Final Approval</CardDescription>
            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved Today</CardDescription>
            <CardTitle className="text-2xl">{stats.approvedToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected Today</CardDescription>
            <CardTitle className="text-2xl">{stats.rejectedToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Approved</CardDescription>
            <CardTitle className="text-2xl">{stats.totalApproved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Decisions</CardTitle>
          <CardDescription>Latest final approvals and rejections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">{r.id}</TableCell>
                  <TableCell>{r.student}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.action} />
                  </TableCell>
                  <TableCell className="text-gray-600 tabular-nums">{r.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

