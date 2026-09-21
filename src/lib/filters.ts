import type { CourseRow, RiskLevel, StudentRecord } from './types';

export interface Filters {
  program: string; // '' = all
  classSection: string;
  semester: string;
  instructor: string;
  riskLevel: RiskLevel | '';
  search: string;
}

export const EMPTY_FILTERS: Filters = {
  program: '',
  classSection: '',
  semester: '',
  instructor: '',
  riskLevel: '',
  search: '',
};

export function studentMatchesFilters(student: StudentRecord, f: Filters): boolean {
  if (f.program && student.program !== f.program) return false;
  if (f.classSection && student.classSection !== f.classSection) return false;
  if (f.riskLevel && student.riskLevel !== f.riskLevel) return false;
  if (f.semester && !student.semesters.some((s) => s.semester === f.semester)) return false;
  if (f.instructor && !student.semesters.some((s) => s.courses.some((c) => c.instructor === f.instructor))) {
    return false;
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    if (!student.studentName.toLowerCase().includes(q) && !student.studentId.toLowerCase().includes(q)) {
      return false;
    }
  }
  return true;
}

export function filterStudents(students: StudentRecord[], f: Filters): StudentRecord[] {
  return students.filter((s) => studentMatchesFilters(s, f));
}

export function allCoursesForStudents(students: StudentRecord[], f: Filters): CourseRow[] {
  const rows: CourseRow[] = [];
  for (const s of students) {
    for (const sem of s.semesters) {
      if (f.semester && sem.semester !== f.semester) continue;
      for (const c of sem.courses) {
        if (f.instructor && c.instructor !== f.instructor) continue;
        rows.push(c);
      }
    }
  }
  return rows;
}

export function uniqueOptions(students: StudentRecord[], pick: (s: StudentRecord) => string): string[] {
  const set = new Set<string>();
  for (const s of students) {
    const v = pick(s);
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

export function uniqueSemesters(students: StudentRecord[]): string[] {
  const set = new Set<string>();
  for (const s of students) for (const sem of s.semesters) if (sem.semester) set.add(sem.semester);
  return Array.from(set);
}

export function uniqueInstructors(students: StudentRecord[]): string[] {
  const set = new Set<string>();
  for (const s of students) for (const sem of s.semesters) for (const c of sem.courses) if (c.instructor) set.add(c.instructor);
  return Array.from(set).sort();
}
