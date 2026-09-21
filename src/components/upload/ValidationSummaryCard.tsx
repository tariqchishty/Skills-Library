import type { DatasetSummary } from '../../lib/types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

export function ValidationSummaryCard({ summary }: { summary: DatasetSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rows read" value={summary.rowsRead} />
        <Stat label="Rows skipped" value={summary.rowsSkipped} />
        <Stat label="Students found" value={summary.studentsFound} />
        <Stat label={summary.layout === 'A' ? 'Course records' : 'Semester records'} value={summary.coursesFound || summary.rowsRead} />
      </div>

      <div className="text-sm text-slate-600">
        Detected layout: <span className="font-semibold text-slate-900">{summary.layout === 'A' ? 'Layout A — one row per student per course' : 'Layout B — one row per student per semester'}</span>
        {' · '}
        Programs: <span className="font-semibold text-slate-900">{summary.programsFound.join(', ') || '—'}</span>
        {' · '}
        Semesters: <span className="font-semibold text-slate-900">{summary.semestersFound.length || '—'}</span>
      </div>

      {summary.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="mb-1 font-semibold">Heads up</div>
          <ul className="list-inside list-disc space-y-0.5">
            {summary.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {summary.skipped.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-700">
            {summary.skipped.length} row{summary.skipped.length > 1 ? 's' : ''} skipped — click to see why
          </summary>
          <div className="mt-2 max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-2">Row</th>
                  <th className="py-1 pr-2">Reason</th>
                  <th className="py-1">Raw content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.skipped.slice(0, 200).map((s, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2 text-slate-500">{s.rowIndex}</td>
                    <td className="py-1 pr-2 text-slate-700">{s.reason}</td>
                    <td className="py-1 text-slate-400">{s.raw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
