import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { apiRequest } from "../../services/apiClient";

function statusBadge(status) {
  const s = String(status || "");
  const map = {
    Approved: { variant: "success", label: "Approved" },
    Rejected: { variant: "destructive", label: "Rejected" },
    ForwardedToDean: { variant: "default", label: "Forwarded to Dean" },
    ForwardedToHoD: { variant: "default", label: "Forwarded to HoD" },
    Submitted: { variant: "warning", label: "Submitted" },
    Draft: { variant: "neutral", label: "Draft" },
  };
  const c = map[s] || { variant: "neutral", label: s || "Unknown" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function buildTimeline(r) {
  const createdAt = r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : null;
  const stage = String(r.currentStage || "");
  const status = String(r.status || "");

  const steps = [
    { step: "Request Created", date: createdAt, status: "completed" },
    { step: "Clerk Review", date: null, status: "pending" },
    { step: "HoD Approval", date: null, status: "pending" },
    { step: "Dean Approval", date: null, status: "pending" },
    { step: "Completed", date: null, status: "pending" },
  ];

  if (status === "Draft") return steps;
  if (status === "Submitted" && stage === "Clerk") {
    steps[1].status = "processing";
    return steps;
  }
  if (status === "ForwardedToHoD" && stage === "HoD") {
    steps[1].status = "completed";
    steps[2].status = "processing";
    return steps;
  }
  if (status === "ForwardedToDean" && stage === "Dean") {
    steps[1].status = "completed";
    steps[2].status = "completed";
    steps[3].status = "processing";
    return steps;
  }
  if (status === "Approved") {
    steps[1].status = "completed";
    steps[2].status = "completed";
    steps[3].status = "completed";
    steps[4].status = "completed";
    return steps;
  }
  if (status === "Rejected") {
    steps[1].status = stage === "Clerk" ? "processing" : "completed";
    steps[2].status = "rejected";
    return steps;
  }

  return steps;
}

export default function Status() {
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest("/api/transcripts/my")
      .then((d) => alive && setRequests(Array.isArray(d) ? d : []))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Status</h1>
        <p className="text-sm text-gray-500">Track the progress of your transcript requests.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests</CardTitle>
          <CardDescription>Click a row to view the timeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-gray-600">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-gray-600">No requests yet.</TableCell></TableRow>
              ) : (
                rows.map((request) => {
                  const isExpanded = expandedId === request.id;
                  const timeline = buildTimeline(request);
                  return (
                    <>
                      <TableRow key={request.id} className="cursor-pointer" onClick={() => toggleExpand(request.id)}>
                        <TableCell className="font-medium text-gray-900">{String(request.id).slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-gray-600 tabular-nums">{request.createdAt ? new Date(request.createdAt).toLocaleString("en-IN") : "-"}</TableCell>
                        <TableCell>{statusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline">
                            View {isExpanded ? "^" : "v"}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded ? (
                        <TableRow key={`${request.id}-details`} className="hover:bg-transparent">
                          <TableCell colSpan={4} className="px-6 py-4 bg-gray-50">
                            <div className="py-2">
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">Request Timeline</h3>
                              <div className="relative">
                                <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200 pointer-events-none" />
                                <div className="space-y-3">
                                  {timeline.map((step, index) => (
                                    <div key={index} className="relative flex items-start gap-3 pl-6">
                                      <div
                                        className={[
                                          "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                                          step.status === "completed"
                                            ? "bg-green-100 text-green-700"
                                            : step.status === "processing"
                                            ? "bg-blue-100 text-blue-700"
                                            : step.status === "rejected"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-gray-100 text-gray-500",
                                        ].join(" ")}
                                        aria-hidden="true"
                                      >
                                        {step.status === "completed" ? "OK" : index + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{step.step}</p>
                                        {step.date ? <p className="text-xs text-gray-500 mt-0.5">{step.date}</p> : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

