import { Settings } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function HodSettings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile and notification preferences for HoD will be added here without changing the approval workflow."
      />
      <EmptyState
        icon={Settings}
        title="Settings module not configured yet"
        description="The page exists now with a proper empty state instead of a blank placeholder. Workflow pages remain unaffected."
        badge="Coming Soon"
      />
    </div>
  );
}

