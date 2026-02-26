import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

export default function HodPendingApprovals() {
  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
        Pending approvals list will be available once HoD pending APIs are connected.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>There are no records to show.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This page is intentionally blank until real HoD queue endpoints exist.
        </CardContent>
      </Card>
    </div>
  );
}

