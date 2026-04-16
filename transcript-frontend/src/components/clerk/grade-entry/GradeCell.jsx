import { useMemo } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { GRADE_OPTIONS } from "./gradeUtils";

export default function GradeCell({
  rowIndex,
  subjectCode,
  value,
  disabled,
  triggerId,
  onChange,
  onFocusRow,
  onMoveDown,
  placeholder,
  className,
}) {
  const ph = useMemo(() => placeholder || "Select", [placeholder]);

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => {
        onChange?.(subjectCode, v);
        // Excel-like: after commit, move down
        setTimeout(() => onMoveDown?.(rowIndex), 0);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={triggerId}
        aria-label={`Grade for ${subjectCode}`}
        onFocus={() => onFocusRow?.(rowIndex)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onMoveDown?.(rowIndex);
          }
        }}
        className={["h-9 rounded-lg justify-between tabular-nums", className || ""].join(" ")}
      >
        <SelectValue placeholder={ph} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NA">Not Applicable</SelectItem>
        {GRADE_OPTIONS.map((g) => (
          <SelectItem key={g} value={g}>
            {g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
