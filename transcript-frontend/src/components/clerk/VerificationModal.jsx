import { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { downloadDocument } from "../../services/documentDownloadService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Textarea } from "../ui/textarea";

const typeLabel = (t) => {
  const s = String(t || "");
  if (/marksheet/i.test(s)) return "Marksheet";
  if (/government/i.test(s)) return "Government ID";
  if (/authority/i.test(s)) return "Authority Letter";
  return s || "-";
};

export default function VerificationModal({ open, data, onApprove, onReturn, onClose, busy }) {
  const [remarks, setRemarks] = useState("");
  const student = data?.student;
  const docs = useMemo(() => (data?.documents || []).slice(), [data]);
  const readOnly = /approved/i.test(String(data?.status || ""));
  const academicYear =
    student?.admissionYear && student?.graduationYear
      ? `${student.admissionYear}-${student.graduationYear}`
      : "-";

  if (!data) return null;

  const canAct = !busy;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="w-[min(92vw,1120px)]">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Student Verification</p>
              <DialogTitle className="truncate">
                {student?.name || "-"} · PRN {student?.prn || "-"}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={data?.status || "Pending"} />
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Email" value={student?.email} />
                <InfoRow label="Mobile" value={student?.mobile} />
                <InfoRow label="DOB" value={student?.dob} />
                <InfoRow label="Nationality" value={student?.nationality} />
                <InfoRow label="Birth Place" value={student?.birthPlace} />
                <InfoRow label="Address" value={student?.address} />
                {readOnly ? <InfoRow label="Approved At" value={data?.actedAt || data?.createdAt} /> : null}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Academic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Faculty" value={student?.faculty} />
                <InfoRow label="Department" value={student?.department} />
                <InfoRow label="Program" value={student?.program} />
                <InfoRow label="Academic Year" value={academicYear} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-gray-50">
                      <TableRow>
                        <TableHead className="w-45">Type</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead className="w-35">Status</TableHead>
                        <TableHead className="w-30" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.length ? (
                        docs.map((d) => (
                          <TableRow key={d.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{typeLabel(d.type)}</TableCell>
                            <TableCell className="max-w-90 truncate" title={d.fileName}>
                              {d.fileName || "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={String(d.status || "")} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => downloadDocument(d.id)} disabled={busy}>
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-sm text-gray-600">
                            No documents found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{readOnly ? "Review Notes" : "Remarks"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  readOnly={readOnly}
                  placeholder="Add remarks (required for Return)"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {readOnly ? "This record has already been approved and is kept here for history." : "Return requires remarks. Approve is allowed without remarks."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {!readOnly ? (
            <>
              <Button variant="destructive" onClick={() => onReturn?.(remarks)} disabled={!canAct || !String(remarks || "").trim()}>
                Return to Student
              </Button>
              <Button onClick={() => onApprove?.(remarks)} disabled={!canAct}>
                Approve Verification
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-xs text-right text-gray-900 wrap-break-word">{value || "-"}</p>
    </div>
  );
}
