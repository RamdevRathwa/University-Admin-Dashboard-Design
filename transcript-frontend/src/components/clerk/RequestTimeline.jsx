export default function RequestTimeline({ steps }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
      <ul className="space-y-4">
        {steps.map((s, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                s.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : s.status === "processing"
                  ? "bg-blue-100 text-blue-700"
                  : s.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.status === "completed" ? "OK" : idx + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{s.label}</p>
              {s.date && <p className="text-xs text-gray-500 mt-0.5">{s.date}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
