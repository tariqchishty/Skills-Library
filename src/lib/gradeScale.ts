import type { GradeBand } from './types';

export function normalizeGradeLabel(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function findGradeBand(scale: GradeBand[], gradeRaw: string): GradeBand | null {
  const normalized = normalizeGradeLabel(gradeRaw);
  return scale.find((b) => normalizeGradeLabel(b.grade) === normalized) ?? null;
}

export function pointsForGrade(scale: GradeBand[], gradeRaw: string): number | null {
  const band = findGradeBand(scale, gradeRaw);
  return band ? band.points : null;
}

export function gradeForMarks(scale: GradeBand[], marks: number): GradeBand | null {
  // Sort descending by minMarks so we match the highest applicable band.
  const sorted = [...scale].sort((a, b) => b.minMarks - a.minMarks);
  for (const band of sorted) {
    if (marks >= band.minMarks && marks <= band.maxMarks) return band;
  }
  return null;
}

export function isNonGradedToken(raw: string): 'I' | 'W' | null {
  const v = raw.trim().toUpperCase();
  if (v === '' || v === '-' || v === '--' || v === 'N/A' || v === 'NA') return null;
  if (v === 'I' || v === 'INC' || v === 'INCOMPLETE') return 'I';
  if (v === 'W' || v === 'WD' || v === 'WITHDRAWN' || v === 'WITHDRAW') return 'W';
  return null;
}

export function isBlankToken(raw: string): boolean {
  const v = raw.trim();
  return v === '' || v === '-' || v === '--' || v.toUpperCase() === 'N/A';
}
