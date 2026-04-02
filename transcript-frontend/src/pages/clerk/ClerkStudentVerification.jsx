import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import SearchBar from "../../components/clerk/SearchBar";
import StatusBadge from "../../components/clerk/StatusBadge";
import VerificationModal from "../../components/clerk/VerificationModal";
import { clerkVerificationService } from "../../services/clerkVerificationService";

function formatDateTime(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export default function ClerkStudentVerification() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(null); // detail payload

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await clerkVerificationService.pending(q);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load pending verifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReview = async (requestId) => {
    setBusy(true);
    setError("");
    try {
      const detail = await clerkVerificationService.review(requestId);
      // Attach an overall status hint for modal header badge.
      const pending = (detail?.documents || []).filter((d) => String(d.status || "").toLowerCase() === "pending").length;
      const returned = (detail?.documents || []).filter((d) => String(d.status || "").toLowerCase() === "returned").length;
      const status = returned > 0 ? "Returned" : pending > 0 ? "Pending" : "Approved";
      setActive({ ...detail, status });
      setOpen(true);
    } catch (e) {
      setError(e?.message || "Failed to load verification details.");
    } finally {
      setBusy(false);
    }
  };

  const approve = async (remarks) => {
    if (!active?.requestId) return;
    setBusy(true);
    setError("");
    try {
      await clerkVerificationService.approve(active.requestId, remarks);
      setOpen(false);
      setActive(null);
      await load();
    } catch (e) {
      setError(e?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  };

  const returnToStudent = async (remarks) => {
    if (!active?.requestId) return;
    setBusy(true);
    setError("");
    try {
      await clerkVerificationService.returnToStudent(active.requestId, remarks);
      setOpen(false);
      setActive(null);
      await load();
    } catch (e) {
      setError(e?.message || "Return failed.");
    } finally {
      setBusy(false);
    }
  };

  const empty = !loading && (!rows || rows.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Academic Verification</h2>
          <p className="text-sm text-gray-500">Verify uploaded documents before grade entry is forwarded to HoD.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={load} disabled={loading || busy}>
            Refresh
          </Button>
        </div>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search by name, PRN, email, or mobile"
        rightSlot={
          <Button onClick={load} disabled={loading || busy}>
            Search
          </Button>
        }
      />

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Verifications</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : empty ? "No pending verifications." : `Showing ${rows.length} request(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-65">Student</TableHead>
                  <TableHead className="w-37.5">PRN</TableHead>
                  <TableHead className="min-w-60">Program</TableHead>
                  <TableHead className="w-37.5">Documents</TableHead>
                  <TableHead className="w-47.5">Submitted</TableHead>
                  <TableHead className="w-32.5">Status</TableHead>
                  <TableHead className="w-35 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows && rows.length ? (
                  rows.map((r) => (
                    <TableRow key={r.requestId} className="align-middle hover:bg-gray-50/70">
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-900">{r?.student?.name || "-"}</span>
                          <span className="text-xs text-gray-500 break-all">{r?.student?.email || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium tabular-nums text-gray-900">{r?.student?.prn || "-"}</TableCell>
                      <TableCell className="py-4 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900">{r?.student?.program || "-"}</span>
                          {r?.student?.department ? <span className="text-xs text-gray-500">{r.student.department}</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900">{r?.counts?.pending ?? 0} pending</span>
                          {r?.counts?.returned ? <span className="text-xs font-medium text-red-600">{r.counts.returned} returned</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-xs text-gray-600">{formatDateTime(r?.createdAt)}</TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={r?.status || "Pending"} />
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button size="sm" onClick={() => openReview(r.requestId)} disabled={busy}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-600">
                      {loading ? "Loading..." : "No records."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VerificationModal
        open={open}
        data={active}
        onClose={() => {
          if (busy) return;
          setOpen(false);
          setActive(null);
        }}
        onApprove={approve}
        onReturn={returnToStudent}
        busy={busy}
      />
    </div>
  );
}
