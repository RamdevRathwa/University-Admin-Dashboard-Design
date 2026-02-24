import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

export default function Downloads() {
  const transcripts = [
    { id: "TR-002", issueDate: "2024-01-14", type: "Official Transcript", verificationCode: "MSUB-TR-2024-001234", fileSize: "2.5 MB", status: "Available" },
    { id: "TR-001", issueDate: "2023-12-15", type: "Official Transcript", verificationCode: "MSUB-TR-2023-001189", fileSize: "2.3 MB", status: "Available" },
    { id: "TR-005", issueDate: "2023-11-20", type: "Unofficial Transcript", verificationCode: "MSUB-TR-2023-001056", fileSize: "1.8 MB", status: "Available" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download Transcripts</h1>
          <p className="text-sm text-gray-500">Access your issued transcripts and download them as PDF.</p>
        </div>
        <p className="text-xs text-gray-500">
          {transcripts.length} transcript{transcripts.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {transcripts.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No Transcripts Available</CardTitle>
            <CardDescription>You have not been issued any transcripts yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="/dashboard/request">Request Transcript</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transcripts.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{t.type}</CardTitle>
                      <Badge variant="success">{t.status}</Badge>
                    </div>
                    <CardDescription>Request ID: {t.id} - Issue Date: {t.issueDate}</CardDescription>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2">
                    <Button>Download PDF</Button>
                    <Button variant="outline">Share Link</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Verification Code</p>
                    <p className="mt-1 inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-900">
                      {t.verificationCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">File Size</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{t.fileSize}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
