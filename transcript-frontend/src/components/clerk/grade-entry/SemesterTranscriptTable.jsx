import GradeCell from "./GradeCell";
import { round2 } from "./gradeUtils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { getElectiveOptions, isElectivePlaceholder } from "./electiveOptions";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function SemesterTranscriptTable({
  semIndex,
  program,
  yearTitle,
  termTitle,
  creditPointScheme = 10,
  subjects,
  grades,
  electiveSelections,
  setElectiveSelection,
  setGrade,
  active,
  setActive,
  semesterSummary,
  readOnly = false,
}) {
  const rows = Array.isArray(subjects) ? subjects : [];
  const summary = semesterSummary || {};

  const focusNext = (rowIndex, part) => {
    if (readOnly) return;
    const next = Math.min(rowIndex + 1, rows.length - 1);
    const id = `grade-${semIndex}-${next}-${part}`;
    const el = document.getElementById(id);
    if (el) el.focus();
  };

  const cellBase = "border border-black px-1 py-1 align-middle";
  const headBase = "border border-black px-1 py-1 align-middle text-center text-[11px] font-bold text-gray-900";
  const subHeadBase = "border border-black px-1 py-1 align-middle text-center text-[11px] font-bold text-gray-900";

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between">
        <div className="text-[12px] font-bold text-gray-900">{yearTitle}</div>
        <div className="flex items-center gap-3 text-[11px] text-gray-800">
          <span className="font-bold text-gray-900">Credit Point Scheme</span>
          <span className="tabular-nums font-bold text-gray-900">{creditPointScheme}</span>
        </div>
      </div>

      <div className="text-[12px] font-bold text-gray-900">{termTitle}</div>

      <div className="overflow-x-auto">
        <table className="w-full border-2 border-black bg-white text-[12px]">
          <thead>
            <tr>
              <th className={headBase} rowSpan={3} style={{ width: 46 }}>
                SN
              </th>
              <th className={headBase} rowSpan={3} style={{ minWidth: 260 }}>
                Subjects
              </th>

              <th className={headBase} colSpan={2}>
                Teaching Hours / Week
              </th>
              <th className={headBase} colSpan={2}>
                Credits
              </th>
              <th className={headBase} colSpan={2}>
                Grade Obtained
              </th>
              <th className={headBase} colSpan={2}>
                Grade Points (See Table-1 at the End)
              </th>
              <th className={headBase} colSpan={4}>
                Earned Grade Points
              </th>
            </tr>

            <tr>
              <th className={subHeadBase}>TH</th>
              <th className={subHeadBase}>PR</th>
              <th className={subHeadBase}>TH</th>
              <th className={subHeadBase}>PR</th>
              <th className={subHeadBase}>TH</th>
              <th className={subHeadBase}>PR</th>
              <th className={subHeadBase}>TH</th>
              <th className={subHeadBase}>PR</th>
              <th className={subHeadBase}>TH</th>
              <th className={subHeadBase}>Out of</th>
              <th className={subHeadBase}>PR</th>
              <th className={subHeadBase}>Out of</th>
            </tr>

            <tr>
              <th className={subHeadBase}>A</th>
              <th className={subHeadBase}>B</th>
              <th className={subHeadBase}>C</th>
              <th className={subHeadBase}>D</th>
              <th className={subHeadBase}>E</th>
              <th className={subHeadBase}>F</th>
              <th className={subHeadBase}>G</th>
              <th className={subHeadBase}>H</th>
              <th className={subHeadBase}>I=C*G</th>
              <th className={subHeadBase}>J</th>
              <th className={subHeadBase}>K=D*H</th>
              <th className={subHeadBase}>L</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, rowIndex) => {
              const id = r.curriculumSubjectId || r.CurriculumSubjectId || r.id || r.Id || `${semIndex}-${rowIndex}`;
              const thCredits = safeNum(r.thCredits);
              const prCredits = safeNum(r.prCredits);
              const gradeTh = grades?.[`${id}:th`] || "";
              const gradePr = grades?.[`${id}:pr`] || "";
              const gpTh = thCredits > 0 ? safeNum(r.thGradePoint) : 0;
              const gpPr = prCredits > 0 ? safeNum(r.prGradePoint) : 0;
              const egpTh = safeNum(r.thEarnedGradePoints);
              const egpPr = safeNum(r.prEarnedGradePoints);
              const outTh = safeNum(r.thOutOf);
              const outPr = safeNum(r.prOutOf);
              const rowActive = active?.semIndex === semIndex && active?.rowIndex === rowIndex;

              return (
                <tr key={`${semIndex}-${rowIndex}`} className={rowActive ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className={`${cellBase} text-center tabular-nums`}>{rowIndex + 1}</td>
                  <td className={`${cellBase} text-left`}>
                    {(() => {
                      const subjectName = r.name || r.subjectName || r.SubjectName;
                      const options = getElectiveOptions(program, r);
                      const isElective = r.isElective || r.IsElective || isElectivePlaceholder(r);
                      const selectedElective = electiveSelections?.[id] || "";
                      const hasOptions = options && options.length > 0;

                      // Show dropdown if: it's marked as elective AND has options, OR if we have options (implicit elective)
                      if ((isElective || hasOptions) && hasOptions && !readOnly) {
                        return (
                          <div className="space-y-1">
                            <Select value={selectedElective} onValueChange={(v) => setElectiveSelection?.(id, v)}>
                              <SelectTrigger className="h-8 rounded-none border-black bg-white px-2 text-left text-[12px] font-medium text-gray-900 shadow-none">
                                <SelectValue placeholder="Select elective subject" />
                              </SelectTrigger>
                              <SelectContent className="w-[360px]">
                                {options.map((option) => (
                                  <SelectItem key={option.value} value={option.value} textValue={option.label}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="text-[10px] uppercase tracking-wide text-amber-700">Elective subject</div>
                          </div>
                        );
                      }

                      const persistedSelection = selectedElective || r.selectedElectiveValue || r.SelectedElectiveValue || "";
                      const selectedLabel = options.find((option) => option.value === persistedSelection)?.label;

                      return (
                        <div className="leading-tight">
                          <div className="text-gray-900">{selectedLabel || persistedSelection || subjectName}</div>
                          {isElective || hasOptions ? (
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-700">Elective subject</div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>

                  <td className={`${cellBase} text-center tabular-nums`}>{safeNum(r.thHours) || 0}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{safeNum(r.prHours) || 0}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{round2(thCredits)}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{round2(prCredits)}</td>

                  <td className={`${cellBase} text-center`}>
                    {thCredits > 0 ? (
                      readOnly ? (
                        <span className="font-semibold text-gray-900">{gradeTh || "--"}</span>
                      ) : (
                        <GradeCell
                          rowIndex={rowIndex}
                          subjectCode={`${id}:th`}
                          value={gradeTh}
                          disabled={false}
                          triggerId={`grade-${semIndex}-${rowIndex}-th`}
                          onChange={(_, v) => setGrade?.(id, "th", v)}
                          onFocusRow={() => setActive?.({ semIndex, rowIndex })}
                          onMoveDown={() => focusNext(rowIndex, "th")}
                          placeholder="--"
                          className="h-7 rounded-none border-black bg-white px-0 text-center text-[12px] font-semibold text-gray-900 shadow-none [&>span[aria-hidden=true]]:hidden"
                        />
                      )
                    ) : (
                      <span className="text-gray-700">--</span>
                    )}
                  </td>
                  <td className={`${cellBase} text-center`}>
                    {prCredits > 0 ? (
                      readOnly ? (
                        <span className="font-semibold text-gray-900">{gradePr || "--"}</span>
                      ) : (
                        <GradeCell
                          rowIndex={rowIndex}
                          subjectCode={`${id}:pr`}
                          value={gradePr}
                          disabled={false}
                          triggerId={`grade-${semIndex}-${rowIndex}-pr`}
                          onChange={(_, v) => setGrade?.(id, "pr", v)}
                          onFocusRow={() => setActive?.({ semIndex, rowIndex })}
                          onMoveDown={() => focusNext(rowIndex, "pr")}
                          placeholder="--"
                          className="h-7 rounded-none border-black bg-white px-0 text-center text-[12px] font-semibold text-gray-900 shadow-none [&>span[aria-hidden=true]]:hidden"
                        />
                      )
                    ) : (
                      <span className="text-gray-700">--</span>
                    )}
                  </td>

                  <td className={`${cellBase} text-center tabular-nums`}>{gpTh}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{gpPr}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{thCredits > 0 ? round2(egpTh) : 0}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{thCredits > 0 ? round2(outTh) : 0}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{prCredits > 0 ? round2(egpPr) : 0}</td>
                  <td className={`${cellBase} text-center tabular-nums`}>{prCredits > 0 ? round2(outPr) : 0}</td>
                </tr>
              );
            })}

            <tr className="bg-white">
              <td className={`${cellBase} text-center`} />
              <td className={`${cellBase} font-semibold`}>Semester Total</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.thHoursTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.prHoursTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.thCreditsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.prCreditsTotal)}</td>
              <td className={`${cellBase} text-center`}>--</td>
              <td className={`${cellBase} text-center`}>--</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.thGradePointsSum)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.prGradePointsSum)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.thEarnedGradePointsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.thOutOfTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.prEarnedGradePointsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.prOutOfTotal)}</td>
            </tr>

            <tr className="bg-white">
              <td className={`${cellBase}`} colSpan={2}>
                <span className="font-semibold">Semester</span>
                <span className="ml-2 font-semibold">SGPA</span>
                <span className="ml-2 tabular-nums">{round2(summary.sgpa)}</span>
              </td>
              <td className={`${cellBase} text-center`} colSpan={4}>
                <span className="font-semibold">Percentage</span>
                <span className="ml-2 tabular-nums">{round2(summary.percentage)}</span>
              </td>
              <td className={`${cellBase} text-center`} colSpan={4}>
                <span className="font-semibold">EGP</span>
                <span className="ml-2 tabular-nums">{round2(summary.semesterEarnedGradePoints)}</span>
              </td>
              <td className={`${cellBase}`} colSpan={4} />
            </tr>

            <tr className="bg-white">
              <td className={`${cellBase} text-center`} />
              <td className={`${cellBase} font-semibold`}>Cumulative Total</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativeThHoursTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativePrHoursTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativeThCreditsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativePrCreditsTotal)}</td>
              <td className={`${cellBase} text-center`}>--</td>
              <td className={`${cellBase} text-center`}>--</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativeThGradePointsSum)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativePrGradePointsSum)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativeThEarnedGradePointsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativeThOutOfTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativePrEarnedGradePointsTotal)}</td>
              <td className={`${cellBase} text-center tabular-nums font-semibold`}>{round2(summary.cumulativePrOutOfTotal)}</td>
            </tr>

            <tr className="bg-white">
              <td className={`${cellBase}`} colSpan={2}>
                <span className="font-semibold">Cumulative</span>
                <span className="ml-2 font-semibold">CGPA</span>
                <span className="ml-2 tabular-nums">{round2(summary.cgpa)}</span>
              </td>
              <td className={`${cellBase} text-center`} colSpan={4}>
                <span className="font-semibold">Percentage</span>
                <span className="ml-2 tabular-nums">{round2(summary.cumulativePercentage)}</span>
              </td>
              <td className={`${cellBase} text-center`} colSpan={4}>
                <span className="font-semibold">EGP</span>
                <span className="ml-2 tabular-nums">{round2(summary.cumulativeEarnedGradePoints)}</span>
              </td>
              <td className={`${cellBase}`} colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
