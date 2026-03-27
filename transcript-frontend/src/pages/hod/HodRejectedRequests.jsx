import { XCircle } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function HodRejectedRequests() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rejected Requests"
        description="Returned and rejected HoD decisions will be surfaced here once the history feed is connected."
      />
      <EmptyState
        icon={XCircle}
        title="No rejected requests available"
        description="There is no rejected-request history to show right now. Rejection actions still work from the review page."
        badge="No Data Yet"
      />
    </div>
  );
}

