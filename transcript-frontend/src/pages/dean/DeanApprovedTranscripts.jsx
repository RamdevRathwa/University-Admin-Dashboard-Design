import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function DeanApprovedTranscripts() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Transcripts"
        description="Final-approved transcript records will appear here as the approval history listing is expanded."
      />
      <EmptyState
        icon={CheckCircle2}
        title="No approved transcript history yet"
        description="Dean approval works from the review page. This history page now shows a clear empty state instead of a blank placeholder."
        badge="History Pending"
      />
    </div>
  );
}

