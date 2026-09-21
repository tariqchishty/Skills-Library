import type {
  AppSettings,
  CourseRow,
  ParseResult,
  RiskFlag,
  RiskLevel,
  SemesterMetric,
  SemesterSummaryRow,
  StudentRecord,
} from './types';
import { sortSemesters } from './semesterSort';

const UNSPECIFIED_SEMESTER = 'Unspecified';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildSemesterMetricFromCourses(
  semester: string,
  courses: CourseRow[],
  settings: AppSettings,
): SemesterMetric {
  const graded = courses.filter((c) => !c.isNonGraded);
  const withCredit = graded.filter((c) => c.creditHours !== null && c.creditHours > 0 && c.gradePoints !== null);
  const creditsAttempted = withCredit.reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
  const weightedSum = withCredit.reduce((sum, c) => sum + (c.gradePoints ?? 0) * (c.creditHours ?? 0), 0);
  const computedSgpa = creditsAttempted > 0 ? round2(weightedSum / creditsAttempted) : null;
  const creditsEarned = graded
    .filter((c) => !c.isFail && c.creditHours !== null)
    .reduce((sum, c) => sum + (c.creditHours ?? 0), 0);
  const failedCourseCount = graded.filter((c) => c.isFail).length;
  const weakGradeCount = graded.filter(
    (c) => c.gradePoints !== null && c.gradePoints <= settings.risk.weakGradePointsCeiling,
  ).length;
  const nonGradedCount = courses.filter((c) => c.isNonGraded).length;

  const sourceSgpaVals = courses.map((c) => c.sourceRowSgpa).filter((v): v is number => v !== null);
  const sourceCgpaVals = courses.map((c) => c.sourceRowCgpa).filter((v): v is number => v !== null);

  return {
    semester,
    sgpa: sourceSgpaVals.length ? sourceSgpaVals[0] : null,
    computedSgpa,
    cgpa: sourceCgpaVals.length ? sourceCgpaVals[sourceCgpaVals.length - 1] : null,
    computedCgpa: null, // filled in by caller (needs running cumulative state)
    cgpaMismatch: false, // filled in by caller
    creditsAttempted,
    creditsEarned,
    failedCourseCount,
    weakGradeCount,
    nonGradedCount,
    courses,
  };
}

function buildSemesterMetricFromSummary(row: SemesterSummaryRow): SemesterMetric {
  return {
    semester: row.semester || UNSPECIFIED_SEMESTER,
    sgpa: row.sgpa,
    computedSgpa: row.sgpa,
    cgpa: row.cgpa,
    computedCgpa: row.cgpa,
    cgpaMismatch: false,
    creditsAttempted: row.creditsAttempted ?? 0,
    creditsEarned: row.creditsEarned ?? 0,
    failedCourseCount: 0,
    weakGradeCount: 0,
    nonGradedCount: 0,
    courses: [],
  };
}

function applyCumulativeCgpa(semesters: SemesterMetric[], settings: AppSettings, layoutA: boolean) {
  let runningCredits = 0;
  let runningWeighted = 0;
  for (const sem of semesters) {
    if (layoutA) {
      runningCredits += sem.creditsAttempted;
      const semWeighted = (sem.computedSgpa ?? 0) * sem.creditsAttempted;
      runningWeighted += semWeighted;
      sem.computedCgpa = runningCredits > 0 ? round2(runningWeighted / runningCredits) : null;
      if (sem.cgpa !== null && sem.computedCgpa !== null) {
        sem.cgpaMismatch = Math.abs(sem.cgpa - sem.computedCgpa) > settings.risk.cgpaMismatchTolerance;
      }
    }
    // Layout B: computedCgpa already equals file cgpa (no independent computation possible).
  }
}

function generateRiskReason(flags: RiskFlag[]): string {
  if (flags.length === 0) return 'No risk indicators detected.';
  return flags.map((f) => f.message).join(' ');
}

function computeRisk(student: Omit<StudentRecord, 'riskLevel' | 'riskFlags' | 'riskReason'>, settings: AppSettings): {
  riskLevel: RiskLevel;
  riskFlags: RiskFlag[];
  riskReason: string;
} {
  const flags: RiskFlag[] = [];
  const semesters = student.semesters;
  const latest = semesters[semesters.length - 1];
  const cgpa = student.latestCgpa;

  let highTriggers = 0;
  let mediumTriggers = 0;

  if (cgpa !== null) {
    if (cgpa < settings.risk.lowCgpaThreshold) {
      flags.push({ code: 'LOW_CGPA', message: `CGPA ${cgpa.toFixed(2)} is below the ${settings.risk.lowCgpaThreshold.toFixed(2)} pass threshold.` });
      highTriggers++;
    } else if (cgpa <= settings.risk.warningBandUpper) {
      flags.push({ code: 'WARNING_BAND', message: `CGPA ${cgpa.toFixed(2)} is in the warning band (${settings.risk.lowCgpaThreshold.toFixed(2)}–${settings.risk.warningBandUpper.toFixed(2)}).` });
      mediumTriggers++;
    }
  }

  if (student.totalFailedCourses > 0) {
    flags.push({
      code: 'FAILED_COURSE',
      message: `${student.totalFailedCourses} failed course${student.totalFailedCourses > 1 ? 's' : ''} on record.`,
    });
    highTriggers++;
  }

  // Declining trend: SGPA drop >= threshold across two most recent semesters,
  // or two consecutive drops of any size.
  const sgpaSeries = semesters
    .map((s) => s.computedSgpa ?? s.sgpa)
    .filter((v): v is number => v !== null);
  if (sgpaSeries.length >= 2) {
    const last = sgpaSeries[sgpaSeries.length - 1];
    const prev = sgpaSeries[sgpaSeries.length - 2];
    const bigDrop = prev - last >= settings.risk.decliningDropThreshold;
    let twoConsecutiveDrops = false;
    if (sgpaSeries.length >= 3) {
      const prev2 = sgpaSeries[sgpaSeries.length - 3];
      twoConsecutiveDrops = prev2 > prev && prev > last;
    }
    if (bigDrop || twoConsecutiveDrops) {
      const dropAmount = round2(prev - last);
      flags.push({
        code: 'DECLINING_TREND',
        message: twoConsecutiveDrops && !bigDrop
          ? 'SGPA has declined for two consecutive semesters.'
          : `SGPA declined ${dropAmount.toFixed(2)} over the last two semesters.`,
      });
      mediumTriggers++;
    }
  }

  if (latest && latest.failedCourseCount + latest.weakGradeCount >= settings.risk.highRiskCourseCount && layoutHasCourses(student)) {
    flags.push({
      code: 'HIGH_RISK_LOAD',
      message: `${latest.failedCourseCount + latest.weakGradeCount} weak/failed grades in the most recent term (${latest.semester}).`,
    });
    highTriggers++;
  }

  if (student.isFinalYear && cgpa !== null && cgpa < settings.risk.lowCgpaThreshold) {
    flags.push({
      code: 'GRADUATION_RISK',
      message: 'Final-year student below the minimum CGPA required to graduate.',
    });
    highTriggers++;
  }

  if (semesters.some((s) => s.cgpaMismatch)) {
    flags.push({
      code: 'CGPA_MISMATCH',
      message: 'Reported CGPA in the file does not match the CGPA computed from course grades — verify data.',
    });
  }

  let riskLevel: RiskLevel = 'None';
  if (highTriggers > 0) riskLevel = 'High';
  else if (mediumTriggers > 0) riskLevel = 'Medium';
  else if (flags.some((f) => f.code === 'CGPA_MISMATCH')) riskLevel = 'Low';

  return { riskLevel, riskFlags: flags, riskReason: generateRiskReason(flags) };
}

function layoutHasCourses(student: Pick<StudentRecord, 'layout'>): boolean {
  return student.layout === 'A';
}

export function computeStudentRecords(parsed: ParseResult, settings: AppSettings): StudentRecord[] {
  const records: StudentRecord[] = [];

  if (parsed.layout === 'A') {
    const byStudent = new Map<string, CourseRow[]>();
    for (const row of parsed.courseRows) {
      const list = byStudent.get(row.studentId) ?? [];
      list.push(row);
      byStudent.set(row.studentId, list);
    }

    for (const [studentId, rows] of byStudent) {
      const first = rows[0];
      const bySemester = new Map<string, CourseRow[]>();
      for (const row of rows) {
        const sem = row.semester || UNSPECIFIED_SEMESTER;
        const list = bySemester.get(sem) ?? [];
        list.push(row);
        bySemester.set(sem, list);
      }
      const semesterLabels = sortSemesters([...bySemester.keys()], (s) => s);
      const semesters = semesterLabels.map((sem) => buildSemesterMetricFromCourses(sem, bySemester.get(sem)!, settings));
      applyCumulativeCgpa(semesters, settings, true);

      const latest = semesters[semesters.length - 1];
      const totalFailedCourses = semesters.reduce((sum, s) => sum + s.failedCourseCount, 0);
      const totalCreditsEarned = semesters.reduce((sum, s) => sum + s.creditsEarned, 0);
      const isFinalYear =
        semesters.length > 0 && totalCreditsEarned >= settings.risk.graduationCreditsThreshold;

      const base: Omit<StudentRecord, 'riskLevel' | 'riskFlags' | 'riskReason'> = {
        studentId,
        studentName: first.studentName,
        program: first.program,
        classSection: first.classSection,
        layout: 'A',
        semesters,
        latestCgpa: latest?.computedCgpa ?? latest?.cgpa ?? null,
        latestSgpa: latest?.computedSgpa ?? latest?.sgpa ?? null,
        totalFailedCourses,
        isFinalYear,
      };
      const risk = computeRisk(base, settings);
      records.push({ ...base, ...risk });
    }
  } else {
    const byStudent = new Map<string, SemesterSummaryRow[]>();
    for (const row of parsed.summaryRows) {
      const list = byStudent.get(row.studentId) ?? [];
      list.push(row);
      byStudent.set(row.studentId, list);
    }

    for (const [studentId, rows] of byStudent) {
      const first = rows[0];
      const sorted = sortSemesters(rows, (r) => r.semester);
      const semesters = sorted.map(buildSemesterMetricFromSummary);
      const latest = semesters[semesters.length - 1];
      const totalCreditsEarned = semesters.reduce((sum, s) => sum + s.creditsEarned, 0);
      const isFinalYear =
        semesters.length > 0 && totalCreditsEarned >= settings.risk.graduationCreditsThreshold;

      const base: Omit<StudentRecord, 'riskLevel' | 'riskFlags' | 'riskReason'> = {
        studentId,
        studentName: first.studentName,
        program: first.program,
        classSection: first.classSection,
        layout: 'B',
        semesters,
        latestCgpa: latest?.cgpa ?? null,
        latestSgpa: latest?.sgpa ?? null,
        totalFailedCourses: 0,
        isFinalYear,
      };
      const risk = computeRisk(base, settings);
      records.push({ ...base, ...risk });
    }
  }

  return records.sort((a, b) => a.studentName.localeCompare(b.studentName));
}
