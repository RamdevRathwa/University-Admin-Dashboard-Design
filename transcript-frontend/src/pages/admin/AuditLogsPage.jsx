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
import { ScrollText, Download } from "lucide-react";

function ActionBadge({ action }) {
  const a = String(action || "").toUpperCase();
  if (a.includes("LOGIN")) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">LOGIN</Badge>;
  if (a.includes("APPROVE")) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">APPROVE</Badge>;
  if (a.includes("REJECT")) return <Badge variant="destructive">REJECT</Badge>;
  if (a.includes("UPDATE")) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">UPDATE</Badge>;
  return <Badge variant="secondary">{action || "—"}</Badge>;
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
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Audit Logs</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Append-only audit trail. No delete allowed.</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <Label>Search</Label>
              <Input className="rounded-xl mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="User / entity / record id" />
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
                    <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                    <SelectItem value="APPROVE">APPROVE</SelectItem>
                    <SelectItem value="REJECT">REJECT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="lg:col-span-2">
              <Label>From</Label>
              <Input className="rounded-xl mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <Label>To</Label>
              <Input className="rounded-xl mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <Button variant="outline" className="rounded-xl w-full" onClick={load}>
                Go
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[160px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Record</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-10">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={r.id || r.logId || idx} className="hover:bg-gray-50">
                      <TableCell className="text-sm text-gray-600">{r.time || r.createdAt || "—"}</TableCell>
                      <TableCell className="text-sm">{r.user || r.userName || r.userId || "—"}</TableCell>
                      <TableCell><ActionBadge action={r.action || r.actionType} /></TableCell>
                      <TableCell className="text-sm text-gray-600">{r.entity || r.tableName || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.recordId || "—"}</TableCell>
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
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[820px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Audit Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Action</p>
              <div className="mt-1"><ActionBadge action={selected?.action || selected?.actionType} /></div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Entity</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{selected?.entity || selected?.tableName || "—"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:col-span-2">
              <p className="text-xs text-gray-500">Old Value</p>
              <Textarea className="rounded-xl mt-1 min-h-[110px]" value={selected?.oldValue || ""} readOnly />
            </div>
            <div className="rounded-xl border border-gray-200 p-3 sm:col-span-2">
              <p className="text-xs text-gray-500">New Value</p>
              <Textarea className="rounded-xl mt-1 min-h-[110px]" value={selected?.newValue || ""} readOnly />
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

