import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function HodApprovedRequests() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Requests"
        description="Requests approved by HoD will appear here as the approval history module is expanded."
      />
      <EmptyState
        icon={CheckCircle2}
        title="No approved requests to show yet"
        description="This page is ready, but the approved-history listing is not populated by the backend yet. Current workflow actions still work from Pending Approvals."
        badge="Workflow Ready"
      />
    </div>
  );
}

