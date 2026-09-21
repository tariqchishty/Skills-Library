import type { AppSettings, GradeBand } from './types';

// HEC-aligned 4.0 scale default. Editable in Settings without touching code.
export const DEFAULT_GRADE_SCALE: GradeBand[] = [
  { grade: 'A', minMarks: 85, maxMarks: 100, points: 4.0, status: 'Pass' },
  { grade: 'A-', minMarks: 80, maxMarks: 84, points: 3.66, status: 'Pass' },
  { grade: 'B+', minMarks: 75, maxMarks: 79, points: 3.33, status: 'Pass' },
  { grade: 'B', minMarks: 71, maxMarks: 74, points: 3.0, status: 'Pass' },
  { grade: 'B-', minMarks: 68, maxMarks: 70, points: 2.66, status: 'Pass' },
  { grade: 'C+', minMarks: 64, maxMarks: 67, points: 2.33, status: 'Pass' },
  { grade: 'C', minMarks: 61, maxMarks: 63, points: 2.0, status: 'Pass' },
  { grade: 'C-', minMarks: 58, maxMarks: 60, points: 1.66, status: 'Pass' },
  { grade: 'D+', minMarks: 54, maxMarks: 57, points: 1.33, status: 'Pass' },
  { grade: 'D', minMarks: 50, maxMarks: 53, points: 1.0, status: 'Minimum pass' },
  { grade: 'F', minMarks: 0, maxMarks: 49, points: 0.0, status: 'Fail' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  gradeScale: DEFAULT_GRADE_SCALE,
  risk: {
    minPassingGradePoints: 1.0, // D = 1.00; below this = failed course
    lowCgpaThreshold: 2.0, // below this = probation / high risk
    warningBandUpper: 2.49, // 2.00-2.49 = medium risk warning band, even with no F
    decliningDropThreshold: 0.3, // SGPA drop >= 0.30 across two most recent semesters
    highRiskCourseCount: 2, // 2+ weak/failed grades in a single term
    weakGradePointsCeiling: 1.66, // grade points at/below this count as "weak" (C- and below)
    graduationCreditsThreshold: 100, // credits earned to be considered final-year-ish
    cgpaMismatchTolerance: 0.05,
  },
};
