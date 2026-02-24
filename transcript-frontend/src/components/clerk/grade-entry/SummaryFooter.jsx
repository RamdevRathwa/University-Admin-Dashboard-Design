import { Badge } from "../../ui/badge";

export default function SummaryFooter({ summary, cgpa, incompleteCount }) {
  const totalCredits = summary?.totalCredits ?? 0;
  const totalEarned = summary?.totalEarned ?? 0;
  const sgpa = summary?.sgpa ?? 0;

  return (
    <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200">
      <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Summary</span>
          {incompleteCount > 0 ? (
            <Badge variant="destructive" className="rounded-lg">
              {incompleteCount} missing
            </Badge>
          ) : (
            <Badge className="rounded-lg bg-blue-50 text-[#1e40af] border border-blue-200">Complete</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="text-right">
            <div className="text-xs text-gray-500">Total Credits</div>
            <div className="font-semibold text-gray-900 tabular-nums">{totalCredits}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Earned GP</div>
            <div className="font-semibold text-gray-900 tabular-nums">{totalEarned}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">SGPA</div>
            <div className="font-semibold text-gray-900 tabular-nums">{sgpa}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">CGPA</div>
            <div className="font-semibold text-gray-900 tabular-nums">{cgpa}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
