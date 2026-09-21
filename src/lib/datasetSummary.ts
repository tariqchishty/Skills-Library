import type { DatasetSummary, ParseResult, StudentRecord } from './types';

export function buildDatasetSummary(parsed: ParseResult, students: StudentRecord[]): DatasetSummary {
  const programs = new Set<string>();
  const semesters = new Set<string>();
  let coursesFound = 0;

  for (const s of students) {
    if (s.program) programs.add(s.program);
    for (const sem of s.semesters) {
      if (sem.semester) semesters.add(sem.semester);
      coursesFound += sem.courses.length;
    }
  }

  return {
    rowsRead: parsed.courseRows.length + parsed.summaryRows.length,
    rowsSkipped: parsed.skipped.length,
    studentsFound: students.length,
    coursesFound,
    semestersFound: Array.from(semesters),
    programsFound: Array.from(programs).sort(),
    layout: parsed.layout,
    warnings: parsed.warnings,
    skipped: parsed.skipped,
  };
}
