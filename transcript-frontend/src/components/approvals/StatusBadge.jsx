import { Badge } from "../ui/badge";

const normalize = (s) => String(s || "").trim();

export default function StatusBadge({ status, className }) {
  const s = normalize(status);

  if (/approved/i.test(s)) return <Badge variant="success" className={className}>{s || "Approved"}</Badge>;
  if (/rejected/i.test(s)) return <Badge variant="destructive" className={className}>{s || "Rejected"}</Badge>;
  if (/send back|returned|return/i.test(s)) return <Badge variant="warning" className={className}>{s || "Returned"}</Badge>;
  if (/forward/i.test(s)) return <Badge variant="default" className={className}>{s || "Forwarded"}</Badge>;
  if (/pending/i.test(s)) return <Badge variant="warning" className={className}>{s || "Pending"}</Badge>;
  return <Badge variant="neutral" className={className}>{s || "Unknown"}</Badge>;
}
