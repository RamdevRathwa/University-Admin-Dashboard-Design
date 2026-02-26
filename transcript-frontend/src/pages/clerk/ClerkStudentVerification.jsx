import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";

export default function ClerkStudentVerification() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Student Academic Verification</h2>
        <p className="text-sm text-gray-500">Document verification will be enabled when the backend document module is ready.</p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-[#1e40af]">
        No verification data available right now.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Verifications</CardTitle>
          <CardDescription>There are no pending verification records.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This page is intentionally blank until real document records exist.
        </CardContent>
      </Card>
    </div>
  );
}

