import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

export function Calendar({ selected, onSelect, disabled, className }) {
  const initial = selected instanceof Date ? selected : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const days = useMemo(() => {
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const firstDay = new Date(view.year, view.month, 1).getDay();
    const out = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [view.year, view.month]);

  const today = new Date();

  const isDisabled = (date) => {
    if (!disabled) return false;
    return disabled(date);
  };

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={() => setView((p) => ({ year: p.month === 0 ? p.year - 1 : p.year, month: p.month === 0 ? 11 : p.month - 1 }))} aria-label="Previous month">
          <span aria-hidden="true">‹</span>
        </Button>
        <div className="text-sm font-semibold text-gray-900">
          {monthNames[view.month]} {view.year}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setView((p) => ({ year: p.month === 11 ? p.year + 1 : p.year, month: p.month === 11 ? 0 : p.month + 1 }))} aria-label="Next month">
          <span aria-hidden="true">›</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
          const date = new Date(view.year, view.month, day);
          const selectedFlag = isSameDay(selected, date);
          const todayFlag = isSameDay(today, date);
          const disabledFlag = isDisabled(date);
          return (
            <button
              key={day}
              type="button"
              disabled={disabledFlag}
              onClick={() => onSelect?.(date)}
              className={cn(
                "aspect-square rounded-lg text-sm transition-colors",
                selectedFlag ? "bg-[#1e40af] text-white font-semibold" : "",
                !selectedFlag && todayFlag ? "border border-[#1e40af] text-[#1e40af] font-medium" : "",
                !selectedFlag && !todayFlag && !disabledFlag ? "text-gray-700 hover:bg-gray-100" : "",
                disabledFlag ? "text-gray-300 cursor-not-allowed" : ""
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

