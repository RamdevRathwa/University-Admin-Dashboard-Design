import { useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../ui/table";
import { getGradePoint, getTotalCredits, getEarnedGradePoints, round2 } from "./gradeUtils";
import GradeCell from "./GradeCell";

export default function GradeTable({ subjects, gradesByCode, activeRow, setActiveRow, onChangeGrade, disabled }) {
  const rows = Array.isArray(subjects) ? subjects : [];
  const showHours = useMemo(() => rows.some((r) => (Number(r?.thHours) || 0) > 0 || (Number(r?.prHours) || 0) > 0), [rows]);

  const triggerIdFor = useMemo(() => (idx) => `grade-cell-${idx}`, []);

  const moveDown = (rowIndex) => {
    const next = Math.min(rowIndex + 1, rows.length - 1);
    const id = triggerIdFor(next);
    const el = document.getElementById(id);
    if (el) el.focus();
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <Table className="max-h-[520px]">
        <TableHeader>
          {/* Header Row 1 (Excel-style grouping) */}
          <TableRow className="border-gray-200">
            <TableHead className="sticky top-0 z-20 w-[70px] bg-gray-50" rowSpan={2}>
              SN
            </TableHead>
            <TableHead className="sticky top-0 z-20 w-[120px] bg-gray-50" rowSpan={2}>
              Subject Code
            </TableHead>
            <TableHead className="sticky top-0 z-20 min-w-[320px] bg-gray-50" rowSpan={2}>
              Subjects
            </TableHead>

            {showHours ? (
              <TableHead className="sticky top-0 z-20 bg-gray-50 text-center" colSpan={2}>
                Teaching Hours / Week
              </TableHead>
            ) : null}

            <TableHead className="sticky top-0 z-20 bg-gray-50 text-center" colSpan={2}>
              Credits
            </TableHead>

            <TableHead className="sticky top-0 z-20 w-[220px] bg-gray-50" rowSpan={2}>
              Grade Obtained
            </TableHead>
            <TableHead className="sticky top-0 z-20 w-[140px] bg-gray-50" rowSpan={2}>
              Grade Point
            </TableHead>
            <TableHead className="sticky top-0 z-20 w-[190px] bg-gray-50" rowSpan={2}>
              Earned Grade Points
            </TableHead>
          </TableRow>

          {/* Header Row 2 (TH/PR sub-columns) */}
          <TableRow className="border-gray-200">
            {showHours ? (
              <>
                <TableHead className="sticky top-11 z-20 w-[90px] bg-gray-50 text-center">TH</TableHead>
                <TableHead className="sticky top-11 z-20 w-[90px] bg-gray-50 text-center">PR</TableHead>
              </>
            ) : null}

            <TableHead className="sticky top-11 z-20 w-[90px] bg-gray-50 text-center">TH</TableHead>
            <TableHead className="sticky top-11 z-20 w-[90px] bg-gray-50 text-center">PR</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((s, idx) => {
            const totalCredits = getTotalCredits(s);
            const grade = gradesByCode?.[s.code] || "";
            const gradePoint = getGradePoint(grade);
            const earned = getEarnedGradePoints(gradePoint ?? 0, totalCredits);

            return (
              <TableRow
                key={s.code}
                className={[
                  activeRow === idx ? "bg-blue-50" : "",
                  "focus-within:bg-blue-50",
                ].join(" ")}
              >
                <TableCell className="py-3">{idx + 1}</TableCell>
                <TableCell className="py-3 font-medium text-gray-900">{s.code}</TableCell>
                <TableCell className="py-3 text-gray-800">{s.name}</TableCell>

                {showHours ? (
                  <>
                    <TableCell className="py-3 text-center tabular-nums">{Number(s.thHours || 0) || 0}</TableCell>
                    <TableCell className="py-3 text-center tabular-nums">{Number(s.prHours || 0) || 0}</TableCell>
                  </>
                ) : null}

                <TableCell className="py-3 text-center tabular-nums">{round2(Number(s.thCredits || 0) || 0)}</TableCell>
                <TableCell className="py-3 text-center tabular-nums">{round2(Number(s.prCredits || 0) || 0)}</TableCell>

                <TableCell className="py-2">
                  <GradeCell
                    rowIndex={idx}
                    subjectCode={s.code}
                    value={grade}
                    disabled={disabled}
                    triggerId={triggerIdFor(idx)}
                    onChange={onChangeGrade}
                    onFocusRow={(i) => setActiveRow?.(i)}
                    onMoveDown={moveDown}
                  />
                </TableCell>

                <TableCell className="py-3">
                  <span className="tabular-nums">{gradePoint ?? "-"}</span>
                </TableCell>

                <TableCell className="py-3">
                  <span className="tabular-nums font-semibold text-gray-900">{grade ? round2(earned) : "-"}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
