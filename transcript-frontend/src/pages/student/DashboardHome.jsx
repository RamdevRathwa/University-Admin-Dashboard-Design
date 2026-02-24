import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";

export default function DashboardHome() {
  const stats = [
    { title: "Total Requests", value: "12", variant: "default" },
    { title: "Approved", value: "8", variant: "success" },
    { title: "Pending", value: "3", variant: "warning" },
    { title: "Rejected", value: "1", variant: "destructive" },
  ];

  const recentActivity = [
    { id: "TR-001", date: "2024-01-15", status: "Approved", type: "Official Transcript" },
    { id: "TR-002", date: "2024-01-10", status: "Pending", type: "Unofficial Transcript" },
    { id: "TR-003", date: "2024-01-05", status: "Processing", type: "Official Transcript" },
  ];

  const timeline = [
    { step: "Request Submitted", date: "2024-01-10", status: "completed" },
    { step: "Clerk Review", date: "2024-01-11", status: "completed" },
    { step: "HoD Approval", date: "2024-01-12", status: "completed" },
    { step: "Dean Approval", date: "2024-01-13", status: "pending" },
    { step: "Completed", date: null, status: "pending" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide">{stat.title}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant={stat.variant}>{stat.title}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex justify-end">
        <Button asChild>
          <Link to="/dashboard/request">New Transcript Request</Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <span className="text-xs text-gray-500">Last {recentActivity.length} requests</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium text-gray-900">{activity.id}</TableCell>
                    <TableCell>{activity.date}</TableCell>
                    <TableCell>
                      <StatusBadge status={activity.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Request Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200 pointer-events-none" />
              <ul className="space-y-4 relative">
                {timeline.map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div
                      className={[
                        "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                        item.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {item.status === "completed" ? "OK" : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.step}</p>
                      {item.date ? <p className="text-xs text-gray-500 mt-0.5">{item.date}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Approved: { variant: "success", label: "Approved" },
    Pending: { variant: "warning", label: "Pending" },
    Processing: { variant: "default", label: "Processing" },
    Rejected: { variant: "destructive", label: "Rejected" },
  };
  const c = config[status] || config.Pending;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
