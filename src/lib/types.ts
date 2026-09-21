// Core domain types for Academic Results Intelligence

export type Layout = 'A' | 'B';

export type NonGradedType = 'I' | 'W' | null;

/** One row per student per course (transcript-style). */
export interface CourseRow {
  studentId: string;
  studentName: string;
  program: string;
  classSection: string;
  semester: string;
  courseCode: string;
  courseTitle: string;
  instructor: string;
  marks: number | null;
  grade: string;
  gradePoints: number | null;
  creditHours: number | null;
  sourceRowCgpa: number | null;
  sourceRowSgpa: number | null;
  isNonGraded: boolean;
  nonGradedType: NonGradedType;
  isFail: boolean;
  sourceRowIndex: number;
}

/** One row per student per semester (summary-style). */
export interface SemesterSummaryRow {
  studentId: string;
  studentName: string;
  program: string;
  classSection: string;
  semester: string;
  sgpa: number | null;
  cgpa: number | null;
  creditsAttempted: number | null;
  creditsEarned: number | null;
  sourceRowIndex: number;
}

export type CanonicalField =
  | 'studentId'
  | 'studentName'
  | 'program'
  | 'classSection'
  | 'semester'
  | 'courseCode'
  | 'courseTitle'
  | 'instructor'
  | 'marks'
  | 'grade'
  | 'gradePoints'
  | 'creditHours'
  | 'cgpa'
  | 'sgpa'
  | 'creditsAttempted'
  | 'creditsEarned'
  | 'ignore';

export interface ColumnMapping {
  sourceColumn: string;
  sourceIndex: number;
  mappedTo: CanonicalField;
  confidence: number;
}

export interface SkippedRowInfo {
  rowIndex: number;
  reason: string;
  raw: string;
}

export interface ParseResult {
  layout: Layout;
  headerRowIndex: number;
  rawHeaders: string[];
  mapping: ColumnMapping[];
  courseRows: CourseRow[];
  summaryRows: SemesterSummaryRow[];
  skipped: SkippedRowInfo[];
  totalDataRows: number;
  hasSemester: boolean;
  warnings: string[];
  sampleRows: string[][];
}

export interface GradeBand {
  grade: string;
  minMarks: number;
  maxMarks: number;
  points: number;
  status: 'Pass' | 'Minimum pass' | 'Fail';
}

export type RiskLevel = 'High' | 'Medium' | 'Low' | 'None';

export interface RiskSettings {
  minPassingGradePoints: number;
  lowCgpaThreshold: number;
  warningBandUpper: number;
  decliningDropThreshold: number;
  highRiskCourseCount: number;
  weakGradePointsCeiling: number;
  graduationCreditsThreshold: number;
  cgpaMismatchTolerance: number;
}

export interface AppSettings {
  gradeScale: GradeBand[];
  risk: RiskSettings;
}

export interface SemesterMetric {
  semester: string;
  sgpa: number | null;
  computedSgpa: number | null;
  cgpa: number | null;
  computedCgpa: number | null;
  cgpaMismatch: boolean;
  creditsAttempted: number;
  creditsEarned: number;
  failedCourseCount: number;
  weakGradeCount: number;
  nonGradedCount: number;
  courses: CourseRow[];
}

export interface RiskFlag {
  code:
    | 'LOW_CGPA'
    | 'WARNING_BAND'
    | 'FAILED_COURSE'
    | 'DECLINING_TREND'
    | 'HIGH_RISK_LOAD'
    | 'GRADUATION_RISK'
    | 'CGPA_MISMATCH';
  message: string;
}

export interface StudentRecord {
  studentId: string;
  studentName: string;
  program: string;
  classSection: string;
  layout: Layout;
  semesters: SemesterMetric[]; // sorted chronologically
  latestCgpa: number | null;
  latestSgpa: number | null;
  totalFailedCourses: number;
  riskLevel: RiskLevel;
  riskFlags: RiskFlag[];
  riskReason: string;
  isFinalYear: boolean;
}

export interface DatasetSummary {
  rowsRead: number;
  rowsSkipped: number;
  studentsFound: number;
  coursesFound: number;
  semestersFound: string[];
  programsFound: string[];
  layout: Layout;
  warnings: string[];
  skipped: SkippedRowInfo[];
}
