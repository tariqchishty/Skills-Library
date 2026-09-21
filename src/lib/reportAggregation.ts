import type { CourseRow, StudentRecord } from './types';

export interface GroupStats {
  key: string;
  studentCount: number;
  avgCgpa: number | null;
  atRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  passCount: number;
  failCount: number;
  passRate: number | null;
  gradeDistribution: Record<string, number>;
}

export interface InstructorStats {
  instructor: string;
  courseCode: string;
  courseTitle: string;
  studentCount: number;
  passCount: number;
  failCount: number;
  passRate: number | null;
  avgMarks: number | null;
  gradeDistribution: Record<string, number>;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function coursesOf(student: StudentRecord): CourseRow[] {
  return student.semesters.flatMap((s) => s.courses);
}

function gradeDistributionFor(courses: CourseRow[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const c of courses) {
    if (c.isNonGraded || !c.grade) continue;
    dist[c.grade] = (dist[c.grade] ?? 0) + 1;
  }
  return dist;
}

function groupStatsFromStudents(key: string, students: StudentRecord[]): GroupStats {
  const cgpas = students.map((s) => s.latestCgpa).filter((v): v is number => v !== null);
  const avgCgpa = cgpas.length ? round1(cgpas.reduce((a, b) => a + b, 0) / cgpas.length) : null;
  const courses = students.flatMap(coursesOf).filter((c) => !c.isNonGraded);
  const passCount = courses.filter((c) => !c.isFail).length;
  const failCount = courses.filter((c) => c.isFail).length;
  const total = passCount + failCount;

  return {
    key,
    studentCount: students.length,
    avgCgpa,
    atRiskCount: students.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Medium').length,
    highRiskCount: students.filter((s) => s.riskLevel === 'High').length,
    mediumRiskCount: students.filter((s) => s.riskLevel === 'Medium').length,
    passCount,
    failCount,
    passRate: total > 0 ? round1((passCount / total) * 100) : null,
    gradeDistribution: gradeDistributionFor(courses),
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item) || '(unspecified)';
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

export function classWiseReport(students: StudentRecord[]): GroupStats[] {
  const grouped = groupBy(students, (s) => s.classSection || '(unspecified)');
  return Array.from(grouped.entries())
    .map(([key, list]) => groupStatsFromStudents(key, list))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function programWiseReport(students: StudentRecord[]): GroupStats[] {
  const grouped = groupBy(students, (s) => s.program || '(unspecified)');
  return Array.from(grouped.entries())
    .map(([key, list]) => groupStatsFromStudents(key, list))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function instructorWiseReport(courseRows: CourseRow[]): InstructorStats[] {
  const graded = courseRows.filter((c) => !c.isNonGraded && c.instructor);
  const grouped = groupBy(graded, (c) => `${c.instructor}||${c.courseCode}`);
  const rows: InstructorStats[] = [];
  for (const [key, list] of grouped) {
    const [instructor, courseCode] = key.split('||');
    const passCount = list.filter((c) => !c.isFail).length;
    const failCount = list.filter((c) => c.isFail).length;
    const total = passCount + failCount;
    const marksVals = list.map((c) => c.marks).filter((v): v is number => v !== null);
    rows.push({
      instructor,
      courseCode,
      courseTitle: list.find((c) => c.courseTitle)?.courseTitle ?? '',
      studentCount: list.length,
      passCount,
      failCount,
      passRate: total > 0 ? round1((passCount / total) * 100) : null,
      avgMarks: marksVals.length ? round1(marksVals.reduce((a, b) => a + b, 0) / marksVals.length) : null,
      gradeDistribution: gradeDistributionFor(list),
    });
  }
  return rows.sort((a, b) => a.instructor.localeCompare(b.instructor) || a.courseCode.localeCompare(b.courseCode));
}

export function overallGradeDistribution(students: StudentRecord[]): Record<string, number> {
  return gradeDistributionFor(students.flatMap(coursesOf));
}

export function cgpaHistogramBuckets(students: StudentRecord[]): { bucket: string; count: number }[] {
  const buckets = ['0.0-0.99', '1.0-1.99', '2.0-2.49', '2.5-2.99', '3.0-3.49', '3.5-4.0'];
  const counts = new Map(buckets.map((b) => [b, 0]));
  for (const s of students) {
    const c = s.latestCgpa;
    if (c === null) continue;
    let bucket: string;
    if (c < 1.0) bucket = buckets[0];
    else if (c < 2.0) bucket = buckets[1];
    else if (c < 2.5) bucket = buckets[2];
    else if (c < 3.0) bucket = buckets[3];
    else if (c < 3.5) bucket = buckets[4];
    else bucket = buckets[5];
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return buckets.map((b) => ({ bucket: b, count: counts.get(b) ?? 0 }));
}

export function riskLevelBreakdown(students: StudentRecord[]): { level: string; count: number }[] {
  const levels = ['High', 'Medium', 'Low', 'None'] as const;
  return levels.map((level) => ({ level, count: students.filter((s) => s.riskLevel === level).length }));
}

export interface TrendPoint {
  semester: string;
  avgSgpa: number | null;
  avgCgpa: number | null;
}

export function cohortTrend(students: StudentRecord[]): TrendPoint[] {
  const semesterMap = new Map<string, { sgpaSum: number; sgpaN: number; cgpaSum: number; cgpaN: number; order: number }>();
  students.forEach((s) => {
    s.semesters.forEach((sem, idx) => {
      const entry = semesterMap.get(sem.semester) ?? { sgpaSum: 0, sgpaN: 0, cgpaSum: 0, cgpaN: 0, order: idx };
      const sgpa = sem.computedSgpa ?? sem.sgpa;
      const cgpa = sem.computedCgpa ?? sem.cgpa;
      if (sgpa !== null) {
        entry.sgpaSum += sgpa;
        entry.sgpaN += 1;
      }
      if (cgpa !== null) {
        entry.cgpaSum += cgpa;
        entry.cgpaN += 1;
      }
      entry.order = Math.max(entry.order, idx);
      semesterMap.set(sem.semester, entry);
    });
  });
  return Array.from(semesterMap.entries())
    .sort((a, b) => a[1].order - b[1].order)
    .map(([semester, e]) => ({
      semester,
      avgSgpa: e.sgpaN ? round1(e.sgpaSum / e.sgpaN) : null,
      avgCgpa: e.cgpaN ? round1(e.cgpaSum / e.cgpaN) : null,
    }));
}
