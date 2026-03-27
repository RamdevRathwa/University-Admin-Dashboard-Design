import { XCircle } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function DeanRejectedTranscripts() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rejected Transcripts"
        description="Rejected and returned final-review decisions will be listed here once the backend history endpoint is added."
      />
      <EmptyState
        icon={XCircle}
        title="No rejected transcripts available"
        description="There is nothing to show on this page yet, but it is now presented as a complete state instead of raw placeholder text."
        badge="No Data Yet"
      />
    </div>
  );
}

