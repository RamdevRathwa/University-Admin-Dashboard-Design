import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert } from "../../components/ui/alert";
import { studentTranscriptsService } from "../../services/studentTranscriptsService";

export default function Downloads() {
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await studentTranscriptsService.approved();
        if (!mounted) return;
        setTranscripts(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load approved transcripts.");
        setTranscripts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = async (t) => {
    const id = t?.id || t?.Id;
    if (!id) return;

    setDownloadingId(id);
    setError("");
    try {
      const { blob, fileName } = await studentTranscriptsService.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "transcript.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download Transcripts</h1>
          <p className="text-sm text-gray-500">Access your issued transcripts and download them as PDF.</p>
        </div>
        <p className="text-xs text-gray-500">
          {loading ? "Loading..." : `${transcripts.length} transcript${transcripts.length !== 1 ? "s" : ""} available`}
        </p>
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {loading ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-[240px]" />
              <Skeleton className="h-4 w-[320px]" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-[240px]" />
              <Skeleton className="h-4 w-[320px]" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : transcripts.length === 0 ? (
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
          {transcripts.map((t) => {
            const id = t.id || t.Id;
            const approvedAt = t.approvedAt || t.ApprovedAt;
            const cgpa = t.cgpa ?? t.CGPA ?? 0;
            const semFrom = t.semesterFrom ?? t.SemesterFrom ?? 1;
            const semTo = t.semesterTo ?? t.SemesterTo ?? 1;
            const locked = t.locked ?? t.Locked ?? true;

            return (
              <Card key={id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">Official Transcript</CardTitle>
                        <Badge variant={locked ? "success" : "secondary"}>{locked ? "Available" : "Pending"}</Badge>
                      </div>
                      <CardDescription>
                        Transcript ID: {id} {approvedAt ? `- Approved: ${new Date(approvedAt).toLocaleDateString("en-IN")}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex flex-row md:flex-col gap-2">
                      <Button onClick={() => handleDownload(t)} disabled={!locked || downloadingId === id}>
                        {downloadingId === id ? "Downloading..." : "Download PDF"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Semester Range</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        Sem {semFrom} to Sem {semTo}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">CGPA</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 tabular-nums">{cgpa}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
