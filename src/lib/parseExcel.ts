import * as XLSX from 'xlsx';
import type {
  AppSettings,
  ColumnMapping,
  CourseRow,
  ParseResult,
  SemesterSummaryRow,
  SkippedRowInfo,
} from './types';
import { matchHeaderToField } from './columnAliases';
import { findGradeBand, gradeForMarks, isNonGradedToken, isBlankToken, normalizeGradeLabel } from './gradeScale';

type Grid = unknown[][];

const SUMMARY_ROW_KEYWORDS = [
  'total', 'average', 'summary', 'generated', 'end of report', 'grand total',
  'report generated', 'prepared by', 'note:', 'key:', 'legend',
];

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

function cellToNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/%/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function readWorkbookGrid(data: ArrayBuffer): Grid {
  const wb = XLSX.read(data, { type: 'array' });
  // Pick the sheet with the most non-empty rows (handles extra blank/info sheets).
  let bestGrid: Grid = [];
  let bestScore = -1;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' }) as Grid;
    const nonEmpty = grid.filter((row) => row.some((c) => cellToString(c) !== '')).length;
    if (nonEmpty > bestScore) {
      bestScore = nonEmpty;
      bestGrid = grid;
    }
  }
  return bestGrid;
}

function forwardFillBlanks(row: string[]): string[] {
  let last = '';
  return row.map((v) => {
    if (v === '') return last;
    last = v;
    return v;
  });
}

function scoreHeaderRow(row: unknown[]): number {
  let score = 0;
  for (const cell of row) {
    const text = cellToString(cell);
    if (!text) continue;
    const match = matchHeaderToField(text);
    if (match.field !== 'ignore') score += 1;
  }
  return score;
}

function detectHeaderRow(grid: Grid): number {
  const scanLimit = Math.min(15, grid.length);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreHeaderRow(grid[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function buildMapping(headers: string[]): ColumnMapping[] {
  const matches = headers.map((h, idx) => ({ idx, header: h, match: matchHeaderToField(h) }));
  // Greedy unique assignment: highest confidence wins the field first.
  const byConfidence = [...matches].sort((a, b) => b.match.confidence - a.match.confidence);
  const used = new Set<string>();
  const assigned = new Map<number, ColumnMapping>();
  for (const m of byConfidence) {
    if (m.match.field === 'ignore') continue;
    if (used.has(m.match.field)) continue;
    used.add(m.match.field);
    assigned.set(m.idx, {
      sourceColumn: m.header,
      sourceIndex: m.idx,
      mappedTo: m.match.field,
      confidence: m.match.confidence,
    });
  }
  return matches.map((m) => assigned.get(m.idx) ?? {
    sourceColumn: m.header,
    sourceIndex: m.idx,
    mappedTo: 'ignore',
    confidence: 0,
  });
}

function isSummaryOrJunkRow(row: unknown[], mapping: ColumnMapping[]): boolean {
  const allBlank = row.every((c) => cellToString(c) === '');
  if (allBlank) return true;
  const firstFewText = row.slice(0, 3).map(cellToString).join(' ').toLowerCase();
  if (SUMMARY_ROW_KEYWORDS.some((kw) => firstFewText.includes(kw))) return true;
  // A row with data in only one cell (no id/name columns populated) is likely a stray note.
  const idIdx = mapping.find((m) => m.mappedTo === 'studentId')?.sourceIndex;
  const nameIdx = mapping.find((m) => m.mappedTo === 'studentName')?.sourceIndex;
  const idVal = idIdx !== undefined ? cellToString(row[idIdx]) : '';
  const nameVal = nameIdx !== undefined ? cellToString(row[nameIdx]) : '';
  const nonBlankCount = row.filter((c) => cellToString(c) !== '').length;
  if (idVal === '' && nameVal === '' && nonBlankCount <= 2) return true;
  return false;
}

function detectLayout(mapping: ColumnMapping[]): 'A' | 'B' {
  const has = (f: string) => mapping.some((m) => m.mappedTo === f);
  const hasCourseCode = has('courseCode');
  const hasGrade = has('grade');
  const hasSgpaCgpa = has('sgpa') || has('cgpa');
  if (hasCourseCode || hasGrade) return 'A';
  if (hasSgpaCgpa) return 'B';
  return 'A';
}

function normalizeGradeToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 2) return normalizeGradeLabel(trimmed);
  return trimmed;
}

export function parseWorkbookFile(
  data: ArrayBuffer,
  settings: AppSettings,
  mappingOverride?: ColumnMapping[],
): ParseResult {
  const grid = readWorkbookGrid(data);
  if (grid.length === 0) {
    return {
      layout: 'A',
      headerRowIndex: -1,
      rawHeaders: [],
      mapping: [],
      courseRows: [],
      summaryRows: [],
      skipped: [],
      totalDataRows: 0,
      hasSemester: false,
      warnings: ['The file appears to be empty.'],
      sampleRows: [],
    };
  }

  const headerRowIndex = detectHeaderRow(grid);
  const rawHeaderRow = forwardFillBlanks(grid[headerRowIndex].map(cellToString));
  const rawHeaders = rawHeaderRow.map((h, i) => h || `Column ${i + 1}`);
  const mapping = mappingOverride ?? buildMapping(rawHeaders);
  const layout = detectLayout(mapping);
  const hasSemester = mapping.some((m) => m.mappedTo === 'semester');

  const warnings: string[] = [];
  if (!hasSemester) {
    warnings.push('No "Semester" column was detected — trend analysis (declining SGPA/CGPA) will be disabled.');
  }
  if (layout === 'B') {
    warnings.push(
      'This file looks like a semester-summary sheet (one row per student per semester). ' +
        'Course-level failure detection and instructor-wise reports are not available for this layout.',
    );
  }

  const dataRows = grid.slice(headerRowIndex + 1);
  const sampleRows = dataRows.slice(0, 5).map((r) => r.map(cellToString));
  const idxOf = (field: string) => mapping.find((m) => m.mappedTo === field)?.sourceIndex;

  const idIdx = idxOf('studentId');
  const nameIdx = idxOf('studentName');
  const programIdx = idxOf('program');
  const classIdx = idxOf('classSection');
  const semIdx = idxOf('semester');
  const courseCodeIdx = idxOf('courseCode');
  const courseTitleIdx = idxOf('courseTitle');
  const instructorIdx = idxOf('instructor');
  const marksIdx = idxOf('marks');
  const gradeIdx = idxOf('grade');
  const gradePointsIdx = idxOf('gradePoints');
  const creditHoursIdx = idxOf('creditHours');
  const cgpaIdx = idxOf('cgpa');
  const sgpaIdx = idxOf('sgpa');
  const creditsAttemptedIdx = idxOf('creditsAttempted');
  const creditsEarnedIdx = idxOf('creditsEarned');

  const skipped: SkippedRowInfo[] = [];
  const courseRows: CourseRow[] = [];
  const summaryRows: SemesterSummaryRow[] = [];

  dataRows.forEach((row, offset) => {
    const rowIndex = headerRowIndex + 1 + offset + 1; // 1-based, human-friendly (incl. header)
    if (isSummaryOrJunkRow(row, mapping)) {
      const raw = row.map(cellToString).join(' | ').slice(0, 120);
      if (row.some((c) => cellToString(c) !== '')) {
        skipped.push({ rowIndex, reason: 'Looks like a title/summary/blank row', raw });
      }
      return;
    }

    let studentId = idIdx !== undefined ? cellToString(row[idIdx]) : '';
    const studentName = nameIdx !== undefined ? cellToString(row[nameIdx]) : '';
    if (!studentId && studentName) studentId = studentName;

    if (!studentId) {
      skipped.push({
        rowIndex,
        reason: 'Missing student identifier (no Student ID or Name)',
        raw: row.map(cellToString).join(' | ').slice(0, 120),
      });
      return;
    }

    const program = programIdx !== undefined ? cellToString(row[programIdx]) : '';
    const classSection = classIdx !== undefined ? cellToString(row[classIdx]) : '';
    const semester = semIdx !== undefined ? cellToString(row[semIdx]) : '';

    if (layout === 'A') {
      const courseCode = courseCodeIdx !== undefined ? cellToString(row[courseCodeIdx]) : '';
      const gradeRaw = gradeIdx !== undefined ? cellToString(row[gradeIdx]) : '';
      const marks = marksIdx !== undefined ? cellToNumber(row[marksIdx]) : null;
      const fileGradePoints = gradePointsIdx !== undefined ? cellToNumber(row[gradePointsIdx]) : null;

      if (!courseCode && !gradeRaw && marks === null && fileGradePoints === null) {
        skipped.push({
          rowIndex,
          reason: 'No course code, grade, marks, or grade points found for this row',
          raw: row.map(cellToString).join(' | ').slice(0, 120),
        });
        return;
      }

      const nonGraded = gradeRaw ? isNonGradedToken(gradeRaw) : null;
      const isBlankGrade = gradeRaw ? isBlankToken(gradeRaw) : true;
      let grade = '';
      let gradePoints: number | null = null;
      let isNonGradedFlag = false;
      let isFail = false;

      if (nonGraded) {
        isNonGradedFlag = true;
        grade = nonGraded;
      } else if (gradeRaw && !isBlankGrade) {
        grade = normalizeGradeToken(gradeRaw);
        const band = findGradeBand(settings.gradeScale, grade);
        if (band) {
          gradePoints = band.points;
          isFail = gradePoints < settings.risk.minPassingGradePoints;
        } else if (fileGradePoints !== null) {
          gradePoints = fileGradePoints;
          isFail = gradePoints < settings.risk.minPassingGradePoints;
        } else if (marks !== null) {
          const derived = gradeForMarks(settings.gradeScale, marks);
          if (derived) {
            gradePoints = derived.points;
            isFail = gradePoints < settings.risk.minPassingGradePoints;
          }
        }
      } else if (fileGradePoints !== null) {
        gradePoints = fileGradePoints;
        isFail = gradePoints < settings.risk.minPassingGradePoints;
        grade = '';
      } else if (marks !== null) {
        const derived = gradeForMarks(settings.gradeScale, marks);
        if (derived) {
          grade = derived.grade;
          gradePoints = derived.points;
          isFail = gradePoints < settings.risk.minPassingGradePoints;
        }
      } else {
        isNonGradedFlag = true; // blank / ungraded, tracked separately from fails
      }

      const creditHours = creditHoursIdx !== undefined ? cellToNumber(row[creditHoursIdx]) : null;

      courseRows.push({
        studentId,
        studentName: studentName || studentId,
        program,
        classSection,
        semester,
        courseCode: courseCode || '(unspecified course)',
        courseTitle: courseTitleIdx !== undefined ? cellToString(row[courseTitleIdx]) : '',
        instructor: instructorIdx !== undefined ? cellToString(row[instructorIdx]) : '',
        marks,
        grade,
        gradePoints,
        creditHours,
        sourceRowCgpa: cgpaIdx !== undefined ? cellToNumber(row[cgpaIdx]) : null,
        sourceRowSgpa: sgpaIdx !== undefined ? cellToNumber(row[sgpaIdx]) : null,
        isNonGraded: isNonGradedFlag,
        nonGradedType: nonGraded,
        isFail,
        sourceRowIndex: rowIndex,
      });
    } else {
      const sgpa = sgpaIdx !== undefined ? cellToNumber(row[sgpaIdx]) : null;
      const cgpa = cgpaIdx !== undefined ? cellToNumber(row[cgpaIdx]) : null;
      if (sgpa === null && cgpa === null) {
        skipped.push({
          rowIndex,
          reason: 'No SGPA or CGPA value found for this row',
          raw: row.map(cellToString).join(' | ').slice(0, 120),
        });
        return;
      }
      summaryRows.push({
        studentId,
        studentName: studentName || studentId,
        program,
        classSection,
        semester,
        sgpa,
        cgpa,
        creditsAttempted: creditsAttemptedIdx !== undefined ? cellToNumber(row[creditsAttemptedIdx]) : null,
        creditsEarned: creditsEarnedIdx !== undefined ? cellToNumber(row[creditsEarnedIdx]) : null,
        sourceRowIndex: rowIndex,
      });
    }
  });

  return {
    layout,
    headerRowIndex,
    rawHeaders,
    mapping,
    courseRows,
    summaryRows,
    skipped,
    totalDataRows: dataRows.length,
    hasSemester,
    warnings,
    sampleRows,
  };
}

export async function parseUploadedFile(file: File, settings: AppSettings): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  return parseWorkbookFile(buffer, settings);
}
