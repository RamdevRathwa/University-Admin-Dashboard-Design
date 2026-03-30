import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import { adminService } from "../../services/adminService";
import { ScrollText, Download, Copy, Check } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

function ActionBadge({ action }) {
  const a = String(action || "").toUpperCase();
  if (a.includes("LOGIN")) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">LOGIN</Badge>;
  if (a.includes("REGISTER")) return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">REGISTER</Badge>;
  if (a.includes("UPLOAD")) return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">UPLOAD</Badge>;
  if (a.includes("DOWNLOAD")) return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">DOWNLOAD</Badge>;
  if (a.includes("SAVE_DRAFT")) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">SAVE DRAFT</Badge>;
  if (a.includes("SUBMIT")) return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">SUBMIT</Badge>;
  if (a.includes("FORWARD")) return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">FORWARD</Badge>;
  if (a.includes("RETURN")) return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">RETURN</Badge>;
  if (a.includes("APPROVE")) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">APPROVE</Badge>;
  if (a.includes("REJECT")) return <Badge variant="destructive">REJECT</Badge>;
  if (a.includes("UPDATE")) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">UPDATE</Badge>;
  if (a.includes("INSERT")) return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">INSERT</Badge>;
  if (a.includes("DELETE")) return <Badge variant="destructive">DELETE</Badge>;
  return <Badge variant="secondary">{action || "-"}</Badge>;
}

function formatTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEntity(value) {
  const raw = String(value || "").trim();
  if (!raw) return "General";
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function shortenRecord(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (raw.length <= 16) return raw;
  return `${raw.slice(0, 8)}...${raw.slice(-6)}`;
}

function prettifyJson(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState("");
  const [action, setAction] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listAuditLogs({
        q,
        action: action === "All" ? "" : action,
        from,
        to,
        page: 1,
        pageSize: 50,
      });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : [];
      setRows(items);
    } catch (e) {
      setError(e?.message || "Failed to load audit logs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const view = (r) => {
    setSelected(r);
    setCopied(false);
    setOpen(true);
  };

  const copyRecordId = async () => {
    const recordId = selected?.recordId || "";
    if (!recordId) return;
    try {
      await navigator.clipboard.writeText(recordId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        description="Review append-only system activity with cleaner summaries and full trace details on demand."
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Audit Logs</CardTitle>
              <p className="mt-1 text-sm text-gray-500">Append-only activity trail for authentication, workflow, and admin actions.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <ScrollText className="h-4 w-4 text-[#1e40af]" />
              Compliance
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Label>Search</Label>
              <Input className="mt-1 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} placeholder="User, entity, action, or record" />
            </div>
            <div className="lg:col-span-3">
              <Label>Action</Label>
              <div className="mt-1">
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="INSERT">INSERT</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="LOGIN">LOGIN</SelectItem>
                    <SelectItem value="UPLOAD">UPLOAD</SelectItem>
                    <SelectItem value="SUBMIT">SUBMIT</SelectItem>
                    <SelectItem value="APPROVE">APPROVE</SelectItem>
                    <SelectItem value="REJECT">REJECT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-2">
              <Label>From</Label>
              <Input className="mt-1 rounded-xl" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <Label>To</Label>
              <Input className="mt-1 rounded-xl" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end lg:col-span-1">
              <Button variant="outline" className="w-full rounded-xl" onClick={load}>
                Go
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="w-[180px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="w-[180px]">Record</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8">
                      <EmptyState
                        icon={ScrollText}
                        title="No audit logs found"
                        description="There are no audit entries matching the selected filters."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={r.id || r.logId || idx} className="hover:bg-gray-50/70">
                      <TableCell className="whitespace-nowrap text-sm text-gray-600">{formatTime(r.time || r.createdAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{r.user || r.userName || r.userId || "-"}</div>
                      </TableCell>
                      <TableCell><ActionBadge action={r.action || r.actionType} /></TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {formatEntity(r.entity || r.tableName)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600" title={r.recordId || "-"}>{shortenRecord(r.recordId)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" className="rounded-xl" onClick={() => view(r)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" className="rounded-xl" disabled title="Export will be enabled with backend support">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>Audit Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Action</p>
              <div className="mt-1"><ActionBadge action={selected?.action || selected?.actionType} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Entity</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{formatEntity(selected?.entity || selected?.tableName)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Time</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{formatTime(selected?.time || selected?.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">User</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{selected?.user || selected?.userName || selected?.userId || "-"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">Record ID</p>
                {selected?.recordId ? (
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={copyRecordId}>
                    {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">
                {selected?.recordId || "-"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:col-span-2">
              <p className="text-xs text-gray-500">Old Value</p>
              <Textarea className="mt-1 min-h-[110px] rounded-xl font-mono text-xs" value={prettifyJson(selected?.oldValue)} readOnly />
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:col-span-2">
              <p className="text-xs text-gray-500">New Value</p>
              <Textarea className="mt-1 min-h-[110px] rounded-xl font-mono text-xs" value={prettifyJson(selected?.newValue)} readOnly />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
