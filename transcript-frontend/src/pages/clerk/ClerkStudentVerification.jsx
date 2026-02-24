import { useEffect, useMemo, useState } from "react";
import { fetchVerificationStudents } from "../../services/mockClerkApi";
import SearchBar from "../../components/clerk/SearchBar";
import StatusBadge from "../../components/clerk/StatusBadge";
import VerificationModal from "../../components/clerk/VerificationModal";
import RemarksModal from "../../components/clerk/RemarksModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

function SkeletonRow() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-9 w-24 rounded-xl" /></TableCell>
    </TableRow>
  );
}

export default function ClerkStudentVerification() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const [selected, setSelected] = useState(null);
  const [remarksOpen, setRemarksOpen] = useState(false);

  const load = (q) => {
    setLoading(true);
    fetchVerificationStudents(q)
      .then((d) => setStudents(d.students))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load("");
  }, []);

  const filtered = useMemo(() => students, [students]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Student Academic Verification</h2>
        <p className="text-sm text-gray-500">Search students by PRN or name and verify uploaded documents.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <SearchBar
            value={query}
            onChange={(v) => {
              setQuery(v);
              load(v);
            }}
            placeholder="Search by PRN / Name"
            ariaLabel="Search students"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Student List</CardTitle>
              <CardDescription>{filtered.length} records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Program</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-sm font-semibold text-gray-900">No results</p>
                    <p className="text-sm text-gray-500 mt-1">Try searching by PRN or name.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{s.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{s.name}</TableCell>
                    <TableCell>{s.prn}</TableCell>
                    <TableCell>{s.program}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setSelected(s)}>
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VerificationModal
        open={!!selected}
        student={selected}
        onApprove={() => setSelected(null)}
        onReturn={() => setRemarksOpen(true)}
        onClose={() => setSelected(null)}
      />

      <RemarksModal
        open={remarksOpen}
        title="Return to Student"
        placeholder="Add remarks for the student..."
        confirmText="Return"
        onClose={() => setRemarksOpen(false)}
        onConfirm={() => {
          setRemarksOpen(false);
          setSelected(null);
        }}
      />
    </div>
  );
}

