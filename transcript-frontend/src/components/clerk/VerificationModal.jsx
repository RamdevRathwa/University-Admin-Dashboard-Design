import PDFPreviewer from "./PDFPreviewer";
import StatusBadge from "./StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function VerificationModal({ open, student, onApprove, onReturn, onClose }) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="w-full max-w-5xl">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Student Verification</p>
              <DialogTitle className="truncate">
                {student.name} · PRN {student.prn}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={student.status} />
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Email" value={student.personal?.email} />
                <InfoRow label="Mobile" value={student.personal?.mobile} />
                <InfoRow label="DOB" value={student.personal?.dob} />
                <InfoRow label="Nationality" value={student.personal?.nationality} />
                <InfoRow label="Address" value={student.personal?.address} />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Academic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Faculty" value={student.academic?.faculty} />
                <InfoRow label="Department" value={student.academic?.department} />
                <InfoRow label="Program" value={student.program} />
                <InfoRow label="Admission Year" value={student.academic?.admissionYear} />
                <InfoRow label="Graduation Year" value={student.academic?.graduationYear} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PDFPreviewer title="Marksheet" url={student.documents?.marksheetUrl} />
              <PDFPreviewer title="Government ID" url={student.documents?.govtIdUrl} />
            </div>
            <PDFPreviewer title="Authority Letter (Optional)" url={student.documents?.authorityLetterUrl} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onReturn}>
            Return to Student
          </Button>
          <Button onClick={onApprove}>Approve Verification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-xs text-gray-900 text-right break-words">{value || "-"}</p>
    </div>
  );
}

