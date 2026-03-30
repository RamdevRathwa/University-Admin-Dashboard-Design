import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import { apiRequest } from "../../services/apiClient";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Clock3, FileClock, ShieldCheck, XCircle } from "lucide-react";

function getStatusMeta(status) {
  const value = String(status || "");
  const map = {
    Draft: {
      variant: "neutral",
      label: "Draft",
      hint: "Your request has not been submitted yet.",
      icon: FileClock,
    },
    Submitted: {
      variant: "warning",
      label: "Under Clerk Review",
      hint: "Documents and request details are being checked.",
      icon: Clock3,
    },
    GradeEntry: {
      variant: "warning",
      label: "Grade Entry In Progress",
      hint: "The clerk is preparing your semester data.",
      icon: Clock3,
    },
    ReturnedToClerk: {
      variant: "warning",
      label: "Returned for Recheck",
      hint: "The request was sent back for correction.",
      icon: Clock3,
    },
    ForwardedToHoD: {
      variant: "default",
      label: "Pending HoD Approval",
      hint: "The request is waiting for HoD approval.",
      icon: ShieldCheck,
    },
    ForwardedToDean: {
      variant: "default",
      label: "Pending Dean Approval",
      hint: "The request is waiting for Dean approval.",
      icon: ShieldCheck,
    },
    Approved: {
      variant: "success",
      label: "Approved",
      hint: "Your transcript is approved and ready.",
      icon: CheckCircle2,
    },
    Rejected: {
      variant: "destructive",
      label: "Rejected",
      hint: "The request could not be approved.",
      icon: XCircle,
    },
  };

  return map[value] || {
    variant: "neutral",
    label: value || "Unknown",
    hint: "Current request state is unavailable.",
    icon: Clock3,
  };
}

function buildTimeline(record) {
  const createdAt = record.createdAt ? new Date(record.createdAt).toLocaleString("en-IN") : null;
  const stage = String(record.currentStage || "");
  const status = String(record.status || "");

  const steps = [
    { title: "Request submitted", detail: createdAt || "Awaiting submission", state: status === "Draft" ? "current" : "done" },
    { title: "Clerk verification", detail: "Document review and grade-entry readiness check", state: "upcoming" },
    { title: "HoD approval", detail: "Department-level academic approval", state: "upcoming" },
    { title: "Dean approval", detail: "Final university approval", state: "upcoming" },
    { title: "Transcript issued", detail: "Approved transcript becomes available for download", state: "upcoming" },
  ];

  if (status === "Draft") {
    steps[0].title = "Draft saved";
    steps[0].detail = "Complete and submit the request to start processing";
    return steps;
  }

  if (status === "Submitted" && stage === "Clerk") {
    steps[0].state = "done";
    steps[1].state = "current";
    return steps;
  }

  if (status === "GradeEntry" || status === "ReturnedToClerk") {
    steps[0].state = "done";
    steps[1].state = "current";
    steps[1].detail = status === "ReturnedToClerk" ? "Returned to clerk for correction and reprocessing" : "Clerk is preparing academic entries";
    return steps;
  }

  if (status === "ForwardedToHoD" && stage === "HoD") {
    steps[0].state = "done";
    steps[1].state = "done";
    steps[2].state = "current";
    return steps;
  }

  if (status === "ForwardedToDean" && stage === "Dean") {
    steps[0].state = "done";
    steps[1].state = "done";
    steps[2].state = "done";
    steps[3].state = "current";
    return steps;
  }

  if (status === "Approved") {
    return steps.map((step, index) => ({
      ...step,
      state: index === 4 ? "current" : "done",
    }));
  }

  if (status === "Rejected") {
    steps[0].state = "done";
    steps[1].state = stage === "Clerk" ? "rejected" : "done";
    steps[2].state = stage === "HoD" ? "rejected" : steps[2].state;
    steps[3].state = stage === "Dean" ? "rejected" : steps[3].state;
    return steps;
  }

  return steps;
}

function TimelineStep({ index, step }) {
  const tone =
    step.state === "done"
      ? "bg-green-100 text-green-700 border-green-200"
      : step.state === "current"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : step.state === "rejected"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-gray-100 text-gray-500 border-gray-200";

  const connector = step.state === "done" ? "bg-green-200" : "bg-gray-200";

  return (
    <div className="relative flex gap-4 pl-12">
      <div className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${tone}`}>
        {step.state === "done" ? "✓" : index + 1}
      </div>
      {index < 4 ? <div className={`absolute left-4 top-8 h-full w-px ${connector}`} aria-hidden="true" /> : null}
      <div className="pb-5">
        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
        <p className="mt-1 text-sm text-gray-500">{step.detail}</p>
      </div>
    </div>
  );
}

export default function Status() {
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    apiRequest("/api/transcripts/my")
      .then((data) => {
        if (!alive) return;
        setRequests(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "Unable to load request status right now.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  return (
    <div className="space-y-6">
      <PageHeader title="Request Status" description="Track each transcript request from submission to final approval." />

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Transcript Requests</CardTitle>
            <CardDescription>Open any request to view its workflow progress and current review stage.</CardDescription>
          </div>
          <Badge variant="neutral">{rows.length} request{rows.length === 1 ? "" : "s"}</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-600">Loading request status...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No requests submitted yet"
              description="Once you submit a transcript request, its approval progress will appear here."
            />
          ) : (
            <div className="space-y-4">
              {rows.map((request) => {
                const meta = getStatusMeta(request.status);
                const isOpen = expandedId === request.id;
                const Icon = meta.icon;
                const timeline = buildTimeline(request);

                return (
                  <div key={request.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#1e40af]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Request ID</p>
                            <p className="text-sm font-semibold text-gray-900">{String(request.id).slice(0, 8).toUpperCase()}</p>
                          </div>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>

                        <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Submitted On</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {request.createdAt ? new Date(request.createdAt).toLocaleString("en-IN") : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Stage</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">{request.currentStage || "Not available"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status Summary</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">{meta.hint}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setExpandedId((prev) => (prev === request.id ? null : request.id))}>
                          {isOpen ? (
                            <>
                              Hide details <ChevronUp className="ml-2 h-4 w-4" />
                            </>
                          ) : (
                            <>
                              View progress <ChevronDown className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="border-t border-gray-200 bg-gray-50/70 px-5 py-5">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-900">Workflow Timeline</h3>
                          <p className="mt-1 text-sm text-gray-500">This shows where your request currently stands in the approval process.</p>
                        </div>
                        <div className="space-y-1">
                          {timeline.map((step, index) => (
                            <TimelineStep key={`${request.id}-${index}`} index={index} step={step} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
