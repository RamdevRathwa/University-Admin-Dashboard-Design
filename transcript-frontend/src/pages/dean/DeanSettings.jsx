import { Settings } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function DeanSettings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Dean-specific preferences and alerts will be configured here in a later pass."
      />
      <EmptyState
        icon={Settings}
        title="Settings module not configured yet"
        description="This route now has a proper content state and matches the rest of the dashboard polish."
        badge="Coming Soon"
      />
    </div>
  );
}

