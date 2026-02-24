// Matches MSU-style letter grades seen in the provided transcript sheet.
export const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "P", "S", "F"];

export const GRADE_POINTS = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5.5,
  P: 5,
  S: 5,
  F: 0,
};

export function getGradePoint(grade) {
  if (!grade) return null;
  const gp = GRADE_POINTS[String(grade).trim()];
  return Number.isFinite(gp) ? gp : null;
}

export function getTotalCredits(row) {
  const th = Number(row?.thCredits || 0);
  const pr = Number(row?.prCredits || 0);
  return (Number.isFinite(th) ? th : 0) + (Number.isFinite(pr) ? pr : 0);
}

export function getOutOfPoints(credits, scheme = 10) {
  const c = Number(credits);
  const s = Number(scheme);
  if (!Number.isFinite(c) || !Number.isFinite(s)) return 0;
  return c * s;
}

export function getEarnedGradePoints(gradePoint, totalCredits) {
  const gp = Number(gradePoint);
  const tc = Number(totalCredits);
  if (!Number.isFinite(gp) || !Number.isFinite(tc)) return 0;
  return gp * tc;
}

export function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function calcSgpa(totalEarned, totalCredits) {
  const te = Number(totalEarned);
  const tc = Number(totalCredits);
  if (!Number.isFinite(te) || !Number.isFinite(tc) || tc <= 0) return 0;
  return round2(te / tc);
}

export function calcSummary(subjects, gradesByCode) {
  let totalCredits = 0;
  let totalEarned = 0;

  (subjects || []).forEach((s) => {
    const tc = getTotalCredits(s);
    totalCredits += tc;
    const gp = getGradePoint(gradesByCode?.[s.code]);
    totalEarned += getEarnedGradePoints(gp ?? 0, tc);
  });

  const sgpa = calcSgpa(totalEarned, totalCredits);
  return {
    totalCredits: round2(totalCredits),
    totalEarned: round2(totalEarned),
    sgpa,
  };
}

export function calcCgpa(current, previousSemesters) {
  const prev = Array.isArray(previousSemesters) ? previousSemesters : [];
  const prevCredits = prev.reduce((a, s) => a + (Number(s?.credits) || 0), 0);
  const prevEarned = prev.reduce((a, s) => a + (Number(s?.credits) || 0) * (Number(s?.sgpa) || 0), 0);

  const curCredits = Number(current?.totalCredits) || 0;
  const curEarned = Number(current?.totalEarned) || 0;

  const totalCredits = prevCredits + curCredits;
  const totalEarned = prevEarned + curEarned;
  if (totalCredits <= 0) return 0;
  return round2(totalEarned / totalCredits);
}
