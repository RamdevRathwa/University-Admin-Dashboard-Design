import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Wallet } from "lucide-react";
import PageHeader from "../../components/shell/PageHeader";
import EmptyState from "../../components/shell/EmptyState";

export default function Payments() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track transcript payment activity here once the payment gateway module is connected."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>There are no recorded transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Wallet}
            title="Payment module not enabled yet"
            description="This page now shows a proper empty state instead of a blank message. Once payment APIs are connected, history and receipts will appear here."
            badge="Payments Pending"
          />
        </CardContent>
      </Card>
    </div>
  );
}
