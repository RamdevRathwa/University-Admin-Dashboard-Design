import StatusBadge from "./StatusBadge";

export default function StudentCard({ student, onVerify }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-full bg-blue-800 text-white flex items-center justify-center font-semibold">
          {student.name?.charAt(0)?.toUpperCase() || "S"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
          <p className="text-xs text-gray-500 truncate">
            PRN {student.prn} · {student.program}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={student.status} />
        <button
          type="button"
          onClick={onVerify}
          className="px-3 py-2 rounded-xl bg-blue-800 text-white text-xs font-semibold hover:bg-blue-900 transition"
        >
          Verify
        </button>
      </div>
    </div>
  );
}

