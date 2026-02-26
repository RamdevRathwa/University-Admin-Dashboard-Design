import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

export default function HodReviewPage() {
  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
        HoD review page will be enabled once HoD review APIs are connected.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Request</CardTitle>
          <CardDescription>No request data loaded.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This page is intentionally blank until real HoD review endpoints exist.
        </CardContent>
      </Card>
    </div>
  );
}

