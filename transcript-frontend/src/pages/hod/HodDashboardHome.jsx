import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import StatusBadge from "../../components/approvals/StatusBadge";

function buildMockActivity() {
  return [
    { id: "REQ-10021", student: "David Bernardo", prn: "8022053249", program: "BE-CSE", action: "Approved", at: "2026-02-24 10:12" },
    { id: "REQ-10018", student: "Riya Patel", prn: "8022053101", program: "BE-CSE", action: "Rejected", at: "2026-02-24 09:40" },
    { id: "REQ-10015", student: "Aman Shah", prn: "8022052998", program: "BE-CSE", action: "Forwarded to Dean", at: "2026-02-23 17:05" },
  ];
}

export default function HodDashboardHome() {
  const activity = useMemo(() => buildMockActivity(), []);

  const stats = useMemo(() => {
    const pending = 6;
    const approvedToday = 3;
    const rejectedToday = 1;
    const totalProcessed = 48;
    return { pending, approvedToday, rejectedToday, totalProcessed };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Approvals</CardDescription>
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
            <CardDescription>Total Processed</CardDescription>
            <CardTitle className="text-2xl">{stats.totalProcessed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Approval Activity</CardTitle>
          <CardDescription>Latest decisions and forwards.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-gray-900">{a.id}</TableCell>
                  <TableCell>{a.student}</TableCell>
                  <TableCell className="tabular-nums">{a.prn}</TableCell>
                  <TableCell>{a.program}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.action} />
                  </TableCell>
                  <TableCell className="text-gray-600 tabular-nums">{a.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

