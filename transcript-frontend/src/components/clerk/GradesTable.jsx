import { useMemo } from "react";
import StatusBadge from "./StatusBadge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";

function gradeFromPercent(p) {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B+";
  if (p >= 60) return "B";
  if (p >= 50) return "C";
  if (p >= 40) return "D";
  return "F";
}

export default function GradesTable({ rows, values, errors, onChange, onBlurRow }) {
  const computed = useMemo(() => {
    return rows.map((r) => {
      const v = values[r.code] || { th: "", pr: "" };
      const th = v.th === "" ? 0 : Number(v.th);
      const pr = v.pr === "" ? 0 : Number(v.pr);
      const max = Number(r.thMax) + Number(r.prMax);
      const got = th + pr;
      const pct = max > 0 ? Math.round((got / max) * 100) : 0;
      const grade = gradeFromPercent(pct);
      const status = v.th !== "" && (r.prMax === 0 || v.pr !== "") ? "Completed" : "Pending";
      return { ...r, th, pr, pct, grade, status };
    });
  }, [rows, values]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Subjects</CardTitle>
            <CardDescription>Enter marks and validate before submitting.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>TH Max</TableHead>
              <TableHead>PR Max</TableHead>
              <TableHead>Theory</TableHead>
              <TableHead>Practical</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {computed.map((r) => {
              const e = errors?.[r.code] || {};
              return (
                <TableRow key={r.code}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{r.code}</div>
                    <div className="text-xs text-gray-500">{r.name}</div>
                  </TableCell>
                  <TableCell>{r.thMax}</TableCell>
                  <TableCell>{r.prMax}</TableCell>
                  <TableCell>
                    <Input
                      value={values[r.code]?.th ?? ""}
                      onChange={(ev) => onChange(r.code, { th: ev.target.value })}
                      onBlur={() => onBlurRow?.(r.code)}
                      inputMode="numeric"
                      className={e.th ? "border-red-500 bg-red-50 focus-visible:ring-red-500 w-28" : "w-28"}
                      placeholder="TH"
                      aria-label={`${r.code} theory marks`}
                    />
                    {e.th ? <p className="text-xs text-red-600 mt-1">{e.th}</p> : null}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={values[r.code]?.pr ?? ""}
                      onChange={(ev) => onChange(r.code, { pr: ev.target.value })}
                      onBlur={() => onBlurRow?.(r.code)}
                      inputMode="numeric"
                      disabled={Number(r.prMax) === 0}
                      className={[
                        "w-28",
                        Number(r.prMax) === 0 ? "bg-gray-100 text-gray-500" : "",
                        e.pr ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : "",
                      ].join(" ")}
                      placeholder="PR"
                      aria-label={`${r.code} practical marks`}
                    />
                    {e.pr ? <p className="text-xs text-red-600 mt-1">{e.pr}</p> : null}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">{r.pct}%</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{r.grade}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

