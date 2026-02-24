import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../../components/clerk/StatusBadge";
import RequestTimeline from "../../components/clerk/RequestTimeline";
import RemarksModal from "../../components/clerk/RemarksModal";
import { fetchTranscriptQueue } from "../../services/mockClerkApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

function SkeletonRow() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
      <TableCell><Skeleton className="h-6 w-44 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-9 w-28 rounded-xl" /></TableCell>
    </TableRow>
  );
}

export default function ClerkTranscriptRequests() {
  const params = useParams();
  const id = params?.id;
  if (id) return <RequestDetail requestId={id} />;
  return <Queue />;
}

function Queue() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [remarksOpen, setRemarksOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTranscriptQueue()
      .then((d) => alive && setRequests(d.requests))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transcript Requests Queue</h2>
          <p className="text-sm text-gray-500">Manage requests and forward them through the approval flow.</p>
        </div>
        <Badge variant="neutral">Queue - UI only</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Requests</CardTitle>
              <CardDescription>{requests.length} records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Semester Status</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : requests.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">No requests</p>
                    <p className="text-sm text-gray-500 mt-1">Queue is empty.</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-900">{r.id}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.program}</TableCell>
                    <TableCell className="text-gray-600">{r.semesterStatus}</TableCell>
                    <TableCell className="text-gray-600">{r.stage}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/clerk/requests/${r.id}`}>View</Link>
                      </Button>
                      <Button size="sm" onClick={() => setRemarksOpen(true)}>
                        Return
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RemarksModal
        open={remarksOpen}
        title="Return to Student"
        placeholder="Add remark..."
        confirmText="Return"
        onClose={() => setRemarksOpen(false)}
        onConfirm={() => setRemarksOpen(false)}
      />
    </div>
  );
}

function RequestDetail({ requestId }) {
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const timeline = useMemo(
    () => [
      { label: "Request Submitted", date: "2024-01-10", status: "completed" },
      { label: "Clerk Review", date: "2024-01-11", status: "processing" },
      { label: "HoD Approval", date: null, status: "pending" },
      { label: "Dean Approval", date: null, status: "pending" },
      { label: "Completed", date: null, status: "pending" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Request Detail</h2>
          <p className="text-sm text-gray-500">Request ID: {requestId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/clerk/requests">Back to Queue</Link>
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          <Button onClick={() => setRemarksOpen(true)}>Return</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Name" value="David Bernardo" />
              <Info label="PRN" value="8022053249" />
              <Info label="Program" value="BE-CSE" />
              <Info label="Email" value="david.bernardo@example.com" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Faculty" value="Technology and Engineering" />
              <Info label="Department" value="Computer Science and Engineering" />
              <Info label="Admission Year" value="2022" />
              <Info label="Expected Graduation" value="2026" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Semester-wise Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((s, i) => (
                    <TableRow key={s}>
                      <TableCell className="font-medium text-gray-900">{s}</TableCell>
                      <TableCell>
                        <StatusBadge status={i < 2 ? "Completed" : "Pending"} />
                      </TableCell>
                      <TableCell className="text-gray-600">{i < 2 ? "Grades entered" : "Awaiting entry"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestTimeline steps={timeline} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DocRow label="Marksheet" />
              <DocRow label="Government ID" />
              <DocRow label="Authority Letter" />
            </CardContent>
          </Card>
        </div>
      </div>

      <RemarksModal
        open={remarksOpen}
        title="Return to Student"
        placeholder="Add remark..."
        confirmText="Return"
        onClose={() => setRemarksOpen(false)}
        onConfirm={() => setRemarksOpen(false)}
      />

      <RemarksModal
        open={rejectOpen}
        title="Reject Request"
        placeholder="Provide rejection reason..."
        confirmText="Reject"
        onClose={() => setRejectOpen(false)}
        onConfirm={() => setRejectOpen(false)}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function DocRow({ label }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        <p className="text-xs text-gray-500">Required - Mock</p>
      </div>
      <Button size="sm">View</Button>
    </div>
  );
}
