import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clerkRequestsService } from "../../services/clerkRequestsService";
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
      <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
      <TableCell><Skeleton className="h-9 w-36 rounded-xl" /></TableCell>
    </TableRow>
  );
}

export default function ClerkReturnedRequests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    clerkRequestsService
      .returned()
      .then((d) => alive && setRequests(d?.requests || []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Returned Requests</h2>
        <p className="text-sm text-gray-500">Requests returned by HoD for correction.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Returned List</CardTitle>
              <CardDescription>{loading ? "Loading..." : `${requests.length} records`}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>PRN</TableHead>
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
                    <TableCell className="font-medium text-gray-900">{String(r.id).slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell className="tabular-nums">{r.prn || "-"}</TableCell>
                    <TableCell className="text-gray-700">{r.remarks || "-"}</TableCell>
                    <TableCell className="text-gray-600 tabular-nums">{r.date ? new Date(r.date).toLocaleString("en-IN") : "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/clerk/grades?prn=${encodeURIComponent(r.prn || "")}`)}
                        disabled={!r.prn}
                      >
                        Open Grade Entry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

