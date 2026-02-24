import { useEffect, useState } from "react";
import { fetchReturnedRequests } from "../../services/mockClerkApi";
import RemarksModal from "../../components/clerk/RemarksModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";

function SkeletonRow() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-64 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell><Skeleton className="h-9 w-32 rounded-xl" /></TableCell>
    </TableRow>
  );
}

export default function ClerkReturnedRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchReturnedRequests()
      .then((d) => alive && setRequests(d.requests))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rejected / Returned Requests</h2>
        <p className="text-sm text-gray-500">Fix issues and resubmit returned requests (UI only).</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Returned List</CardTitle>
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
                <TableHead>Returned By</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : requests.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">No returned requests</p>
                    <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-900">{r.id}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.returnedBy}</TableCell>
                    <TableCell className="text-gray-600">{r.remarks}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setOpen(true)}>
                        Fix & Resubmit
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
        open={open}
        title="Fix & Resubmit"
        placeholder="Add the fix summary..."
        confirmText="Resubmit"
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}

