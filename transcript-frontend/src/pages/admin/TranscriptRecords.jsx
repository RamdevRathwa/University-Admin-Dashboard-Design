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
import { FileText, Download, CheckCircle2, Send } from "lucide-react";

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  if (s.includes("PENDING")) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
  if (s.includes("APPROVED") || s.includes("LOCK")) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
  if (s.includes("REJECT")) return <Badge variant="destructive">Rejected</Badge>;
  if (s.includes("PUBLISH")) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Published</Badge>;
  return <Badge variant="secondary">{status || "—"}</Badge>;
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

  const publish = async (t) => {
    try {
      await adminService.publishTranscript(t.id || t.transcriptId);
      toast({ title: "Transcript published" });
      await load();
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Unable to publish transcript.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
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
                  <TableHead>Status</TableHead>
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
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-10">
                      No transcripts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t.id || t.transcriptId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{t.requestNo || t.requestNumber || t.requestId || "—"}</TableCell>
                      <TableCell>{t.studentName || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{t.prn || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{t.cgpa ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" className="rounded-xl" onClick={() => review(t)}>
                            View
                          </Button>
                          <Button
                            className="rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]"
                            onClick={() => publish(t)}
                            disabled={!String(t.status || "").toUpperCase().includes("APPROVED")}
                            title="Publish only after Dean approval"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Publish
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
        <DialogContent className="sm:max-w-[760px] rounded-xl">
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
              <p className="text-xs text-gray-500">Status</p>
              <div className="mt-1"><StatusBadge status={selected?.status} /></div>
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
            <Button variant="outline" className="rounded-xl" disabled title="Download requires backend endpoint">
              <Download className="h-4 w-4 mr-2" />
              Download Copy
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

