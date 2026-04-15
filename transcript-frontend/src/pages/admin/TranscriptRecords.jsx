import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/use-toast";
import { adminService } from "../../services/adminService";
import { FileText, Download, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

function StageBadge({ stage }) {
  const s = String(stage || "").toUpperCase();
  if (s.includes("CLERK")) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Clerk Level</Badge>;
  if (s.includes("HOD")) return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">HoD Level</Badge>;
  if (s.includes("DEAN")) return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">Dean Level</Badge>;
  if (s.includes("ADMIN")) return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Admin Level</Badge>;
  if (s.includes("PUBLISH")) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Published</Badge>;
  if (s.includes("STUDENT")) return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Student Level</Badge>;
  if (s.includes("REJECT")) return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">{stage || "—"}</Badge>;
}

function getTranscriptStatus(t) {
  const status =
    t?.status ||
    t?.statusCode ||
    t?.transcriptStatus ||
    t?.requestStatus ||
    "";

  return String(status || "");
}

function getTranscriptStage(t) {
  const stage = t?.currentStage || t?.stage || t?.workflowStage || "";
  if (stage) return String(stage);

  const status = getTranscriptStatus(t).toUpperCase();
  if (status.includes("PUBLISH")) return "Published";
  if (status.includes("LOCK") || status.includes("READYTOPUBLISH")) return "Admin";
  if (status.includes("APPROVED")) return "Dean";
  if (status.includes("PENDING")) return "Clerk";
  if (status.includes("REJECT")) return "Rejected";
  return "-";
}

export default function TranscriptRecords() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listTranscripts({ q, status: status === "All" ? "" : status, page: 1, pageSize: 50 });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res?.transcripts) ? res.transcripts : Array.isArray(res) ? res : [];
      setRows(items);
    } catch (e) {
      setError(e?.message || "Failed to load transcripts.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const review = (t) => {
    setSelected(t);
    setOpen(true);
  };

  const download = async (t) => {
    const transcriptId = t?.id || t?.transcriptId;
    if (!transcriptId) return;

    setDownloadingId(transcriptId);
    try {
      const url = adminService.getTranscriptDownloadUrl(transcriptId);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e) {
      toast({ title: "Download failed", description: e?.message || "Unable to download transcript.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transcript Records"
        description="Admin can publish after Dean approval, but cannot change academic content or locked transcripts."
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Transcript Records</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Admin can publish after Dean approval. Admin cannot approve academically and cannot edit locked transcripts.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4 text-[#1e40af]" />
              Records
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <Label>Search</Label>
              <Input className="rounded-xl mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Request no / PRN / name" />
            </div>
            <div className="lg:col-span-3">
              <Label>Status</Label>
              <div className="mt-1">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-2 flex items-end">
              <Button variant="outline" className="rounded-xl w-full" onClick={load}>
                Apply
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Request No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>PRN</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Stage of Transcript</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <EmptyState
                        icon={FileText}
                        title="No transcript records found"
                        description="There are no transcript records matching the current filters. Once Dean-approved records reach Admin, they will appear here for publishing."
                        badge="Awaiting Records"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t.id || t.transcriptId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{t.requestNo || t.requestNumber || t.requestId || "—"}</TableCell>
                      <TableCell>{t.studentName || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{t.prn || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{t.cgpa ?? "—"}</TableCell>
                      <TableCell><StageBadge stage={getTranscriptStage(t)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" className="rounded-xl" onClick={() => review(t)}>
                            View
                          </Button>
                          <Button variant="outline" className="rounded-xl" onClick={() => download(t)} disabled={downloadingId === (t.id || t.transcriptId)}>
                            <Download className="h-4 w-4 mr-2" />
                            {downloadingId === (t.id || t.transcriptId) ? "Downloading..." : "Download"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-190 rounded-xl">
          <DialogHeader>
            <DialogTitle>Transcript Details</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Student</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{selected?.studentName || "—"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">PRN</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{selected?.prn || "—"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Stage of Transcript</p>
              <div className="mt-1"><StageBadge stage={getTranscriptStage(selected)} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Verification Code</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{selected?.verificationCode || "—"}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => download(selected)} disabled={!selected || downloadingId === (selected?.id || selected?.transcriptId)}>
              <Download className="h-4 w-4 mr-2" />
              {downloadingId === (selected?.id || selected?.transcriptId) ? "Downloading..." : "Download Copy"}
            </Button>
            <Button className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]" disabled>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              View Approval History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
