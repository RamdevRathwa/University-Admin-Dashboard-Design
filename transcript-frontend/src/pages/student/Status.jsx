import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export default function Status() {
  const [expandedId, setExpandedId] = useState(null);

  const requests = [
    {
      id: "TR-001",
      date: "2024-01-15",
      status: "Pending",
      purpose: "Higher Studies Application",
      timeline: [
        { step: "Request Submitted", date: "2024-01-15", status: "completed" },
        { step: "Clerk Review", date: "2024-01-16", status: "completed" },
        { step: "HoD Approval", date: null, status: "pending" },
        { step: "Dean Approval", date: null, status: "pending" },
        { step: "Completed", date: null, status: "pending" },
      ],
    },
    {
      id: "TR-002",
      date: "2024-01-10",
      status: "Approved",
      purpose: "Visa Application",
      timeline: [
        { step: "Request Submitted", date: "2024-01-10", status: "completed" },
        { step: "Clerk Review", date: "2024-01-11", status: "completed" },
        { step: "HoD Approval", date: "2024-01-12", status: "completed" },
        { step: "Dean Approval", date: "2024-01-13", status: "completed" },
        { step: "Completed", date: "2024-01-14", status: "completed" },
      ],
    },
    {
      id: "TR-003",
      date: "2024-01-05",
      status: "Processing",
      purpose: "Job Application",
      timeline: [
        { step: "Request Submitted", date: "2024-01-05", status: "completed" },
        { step: "Clerk Review", date: "2024-01-06", status: "completed" },
        { step: "HoD Approval", date: "2024-01-08", status: "completed" },
        { step: "Dean Approval", date: null, status: "processing" },
        { step: "Completed", date: null, status: "pending" },
      ],
    },
    {
      id: "TR-004",
      date: "2023-12-20",
      status: "Rejected",
      purpose: "Scholarship Application",
      timeline: [
        { step: "Request Submitted", date: "2023-12-20", status: "completed" },
        { step: "Clerk Review", date: "2023-12-21", status: "completed" },
        { step: "HoD Approval", date: null, status: "rejected" },
      ],
    },
  ];

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
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const isExpanded = expandedId === request.id;
                return (
                  <>
                    <TableRow key={request.id} className="cursor-pointer" onClick={() => toggleExpand(request.id)}>
                      <TableCell className="font-medium text-gray-900">{request.id}</TableCell>
                      <TableCell>{request.date}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" className="h-auto px-0 text-[#1e40af] hover:bg-transparent hover:underline">
                          View {isExpanded ? "^" : "v"}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded ? (
                      <TableRow key={`${request.id}-details`} className="hover:bg-transparent">
                        <TableCell colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="py-2">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Request Timeline</h3>
                            <div className="relative">
                              <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200 pointer-events-none" />
                              <div className="space-y-3">
                                {request.timeline.map((step, index) => (
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Approved: { variant: "success", label: "Approved" },
    Pending: { variant: "warning", label: "Pending" },
    Processing: { variant: "default", label: "Processing" },
    Rejected: { variant: "destructive", label: "Rejected" },
  };
  const c = config[status] || config.Pending;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
