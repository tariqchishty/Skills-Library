// Produces a sortable key for common semester label formats:
// "2024-FA", "Fall 2024", "2025-SP", "Spring 2025", "2024FA", "FA24", etc.
// Falls back to first-seen order when the pattern can't be recognized.

const SEASON_RANK: Record<string, number> = {
  SP: 1, SPRING: 1,
  SU: 2, SUM: 2, SUMMER: 2,
  FA: 3, FALL: 3, AUT: 3, AUTUMN: 3,
  WI: 4, WIN: 4, WINTER: 4,
};

export function semesterSortKey(label: string): number | null {
  const s = label.trim().toUpperCase();
  if (!s) return null;

  const yearMatch = s.match(/(19|20)\d{2}/);
  const seasonMatch = s.match(/SPRING|SUMMER|FALL|WINTER|AUTUMN|SP|SU|FA|WI|AUT|WIN|SUM/);

  let year: number | null = yearMatch ? Number(yearMatch[0]) : null;
  let seasonRank = seasonMatch ? SEASON_RANK[seasonMatch[0]] : undefined;

  if (year === null) {
    // Two-digit year forms like "FA24"
    const twoDigit = s.match(/\d{2}/);
    if (twoDigit) {
      const yy = Number(twoDigit[0]);
      year = yy > 50 ? 1900 + yy : 2000 + yy;
    }
  }

  if (year !== null && seasonRank !== undefined) {
    return year * 10 + seasonRank;
  }
  if (year !== null) {
    return year * 10;
  }
  return null;
}

export function sortSemesters<T>(items: T[], getLabel: (item: T) => string): T[] {
  const withIndex = items.map((item, index) => ({ item, index, key: semesterSortKey(getLabel(item)) }));
  const allRecognized = withIndex.every((w) => w.key !== null);
  if (allRecognized) {
    return withIndex.sort((a, b) => (a.key! - b.key!) || a.index - b.index).map((w) => w.item);
  }
  // Fall back to stable original order when labels don't fit a known pattern.
  return withIndex.sort((a, b) => a.index - b.index).map((w) => w.item);
}
