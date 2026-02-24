import { Badge } from "../ui/badge";

const toVariant = (status) => {
  if (!status) return "neutral";
  if (/approved|verified|completed|forwarded/i.test(status)) return "success";
  if (/pending|verification pending/i.test(status)) return "warning";
  if (/rejected|returned/i.test(status)) return "destructive";
  if (/processing|grade entry pending/i.test(status)) return "default";
  return "neutral";
};

export default function StatusBadge({ status }) {
  return <Badge variant={toVariant(status)}>{status}</Badge>;
}

