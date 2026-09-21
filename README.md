# Academic Results Intelligence

A browser-only tool that helps teachers and academic managers spot at-risk students from an
uploaded Excel results file, before an academic review meeting.

Upload a messy exam-section spreadsheet, confirm the auto-detected column mapping, and the app
computes SGPA/CGPA, flags at-risk students with a plain-English reason, and produces
class/program/instructor reports and a printable PDF — all client-side, with no backend and no
data ever leaving the browser tab.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL and click **Load a sample dataset** to try it immediately with the
bundled sample file (`public/sample-data/sample-results.xlsx` — 30 students, 2 programs, 3
semesters, a few genuine failures, and one student with a clear declining SGPA trend).

To regenerate that sample file: `node scripts/generate-sample.mjs`.

## Building

```bash
npm run build   # type-checks then builds to dist/
```

## How it's put together

- **`src/lib/`** — all the pure logic, independent of React:
  - `parseExcel.ts` — SheetJS-based parsing: detects the header row among title/summary rows,
    auto-maps columns via fuzzy alias matching, detects Layout A (course-level) vs. Layout B
    (semester-summary), normalizes grades, and treats blanks/I/W as non-graded rather than fails.
  - `computeStudents.ts` — computes SGPA per semester and cumulative CGPA from course grades and
    credit hours, cross-checks against any CGPA/SGPA columns already in the file, and runs the
    risk-detection rules (low CGPA, warning band, failed courses, declining trend, high-risk
    course load, graduation risk).
  - `reportAggregation.ts` — class-wise / program-wise / instructor-wise statistics.
  - `pdfExport.ts` — builds the downloadable PDF report (jsPDF + autotable + html2canvas).
  - `defaultSettings.ts` — the default HEC-aligned 4.0 grading scale and risk thresholds; fully
    editable at runtime from the Settings page, no code changes required.
- **`src/state/AppContext.tsx`** — the only piece of app state: the uploaded file's raw buffer,
  the confirmed column mapping, and settings. Parsed data, computed students, and summaries are
  all derived from these via `useMemo` — nothing is persisted unless the user explicitly keeps
  the tab open, and "Clear all data" wipes it instantly.
- **`src/pages/`** — one file per left-nav destination (Upload, Overview Dashboard, Risk List,
  Reports, Export, Settings).

## Data & privacy

Everything runs in the browser tab. No student data is uploaded to a server, stored, or sent
anywhere. Closing the tab or clicking "Clear all data" discards it.
