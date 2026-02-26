import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

export default function HodDashboardHome() {
  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
        HoD dashboard data will appear here once HoD queue endpoints are connected.
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Pending Approvals", value: 0 },
          { title: "Approved Today", value: 0 },
          { title: "Rejected Today", value: 0 },
          { title: "Total Processed", value: 0 },
        ].map((c) => (
          <Card key={c.title}>
            <CardHeader className="pb-3">
              <CardDescription>{c.title}</CardDescription>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Approval Activity</CardTitle>
          <CardDescription>No activity records available.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This section will be connected to real approval logs later.
        </CardContent>
      </Card>
    </div>
  );
}

