import type { CanonicalField } from './types';

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Aliases are normalized (lowercase, alphanumeric-only) at load time.
const RAW_ALIASES: Record<Exclude<CanonicalField, 'ignore'>, string[]> = {
  studentId: [
    'registration no', 'registration number', 'regno', 'reg no', 'reg. no', 'reg#',
    'student id', 'studentid', 'id', 'roll no', 'rollno', 'roll number',
    'university id', 'universityid', 'enrollment no', 'enrollmentno', 'reg',
  ],
  studentName: ['student name', 'studentname', 'name', 'student'],
  program: ['program', 'programme', 'degree', 'degree program', 'course of study'],
  classSection: ['class', 'section', 'class/section', 'classsection', 'batch', 'class section'],
  semester: ['semester', 'sem', 'term', 'session'],
  courseCode: ['course code', 'coursecode', 'crs code', 'crscode', 'subject code', 'code'],
  courseTitle: ['course title', 'coursetitle', 'course name', 'subject title', 'subject', 'title'],
  instructor: ['instructor', 'teacher', 'faculty', 'course instructor', 'taught by', 'faculty name'],
  marks: ['marks', 'marks (%)', 'marks%', 'percentage', 'obtained marks', 'score', 'marks obtained'],
  grade: ['grade', 'ltr grade', 'letter grade', 'lettergrade'],
  gradePoints: ['grade points', 'gradepoints', 'gp', 'points', 'grade point', 'quality points'],
  creditHours: ['credit hours', 'credithours', 'cr hrs', 'credit hrs', 'credits', 'ch', 'cr. hrs'],
  cgpa: ['cgpa', 'cumulative gpa', 'cum gpa', 'cumulativegpa'],
  sgpa: ['sgpa', 'semester gpa', 'gpa', 'term gpa'],
  creditsAttempted: ['credits attempted', 'credit attempted', 'attempted credits', 'cr attempted', 'credits reg'],
  creditsEarned: ['credits earned', 'credit earned', 'earned credits', 'cr earned', 'credits passed'],
};

interface AliasEntry {
  field: Exclude<CanonicalField, 'ignore'>;
  alias: string;
}

const ALIAS_TABLE: AliasEntry[] = Object.entries(RAW_ALIASES).flatMap(([field, aliases]) =>
  aliases.map((alias) => ({ field: field as Exclude<CanonicalField, 'ignore'>, alias: norm(alias) })),
);

// Longer/more specific aliases should win over shorter generic ones (e.g. "credits earned" over "credits").
ALIAS_TABLE.sort((a, b) => b.alias.length - a.alias.length);

export interface FieldMatch {
  field: CanonicalField;
  confidence: number; // 0-100
}

export function matchHeaderToField(rawHeader: string): FieldMatch {
  const h = norm(rawHeader);
  if (!h) return { field: 'ignore', confidence: 0 };

  let best: FieldMatch = { field: 'ignore', confidence: 0 };
  for (const entry of ALIAS_TABLE) {
    let score = 0;
    if (h === entry.alias) {
      score = 100;
    } else if (h.includes(entry.alias) || entry.alias.includes(h)) {
      const longer = Math.max(h.length, entry.alias.length);
      const shorter = Math.min(h.length, entry.alias.length);
      score = Math.round((shorter / longer) * 85);
    }
    if (score > best.confidence) {
      best = { field: entry.field, confidence: score };
    }
  }
  return best.confidence >= 40 ? best : { field: 'ignore', confidence: 0 };
}

export const CANONICAL_FIELD_LABELS: Record<CanonicalField, string> = {
  studentId: 'Student ID',
  studentName: 'Student Name',
  program: 'Program',
  classSection: 'Class / Section',
  semester: 'Semester',
  courseCode: 'Course Code',
  courseTitle: 'Course Title',
  instructor: 'Instructor',
  marks: 'Marks (%)',
  grade: 'Grade',
  gradePoints: 'Grade Points',
  creditHours: 'Credit Hours',
  cgpa: 'CGPA',
  sgpa: 'SGPA',
  creditsAttempted: 'Credits Attempted',
  creditsEarned: 'Credits Earned',
  ignore: 'Ignore this column',
};
