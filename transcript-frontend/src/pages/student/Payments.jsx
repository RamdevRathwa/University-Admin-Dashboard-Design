import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

export default function Payments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Payment history will appear here once the payment module is enabled.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
        No payment data available right now.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>There are no recorded transactions.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This page is intentionally blank until payment APIs are connected.
        </CardContent>
      </Card>
    </div>
  );
}

