import { Check } from "lucide-react";

function Step({ label, active, done }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px]">
      <div
        className={[
          "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
          done ? "bg-[#1e40af] border-[#1e40af] text-white" : active ? "bg-blue-50 border-blue-200 text-[#1e40af]" : "bg-white border-gray-200 text-gray-500",
        ].join(" ")}
        aria-label={label}
      >
        {done ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">{label.slice(0, 1)}</span>}
      </div>
      <div className={["text-xs font-semibold", active || done ? "text-gray-900" : "text-gray-500"].join(" ")}>
        {label}
      </div>
    </div>
  );
}

export default function ApprovalTimeline({ currentStage }) {
  const steps = ["Clerk", "HoD", "Dean", "Admin"];
  const cur = String(currentStage || "").trim();
  const currentIndex = Math.max(0, steps.findIndex((s) => s.toLowerCase() === cur.toLowerCase()));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        {steps.map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <Step label={s} active={idx === currentIndex} done={idx < currentIndex} />
            {idx !== steps.length - 1 ? (
              <div className="flex-1 h-[2px] bg-gray-200 mx-2" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

