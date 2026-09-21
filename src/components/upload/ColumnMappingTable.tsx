import type { CanonicalField, ColumnMapping } from '../../lib/types';
import { CANONICAL_FIELD_LABELS } from '../../lib/columnAliases';

const FIELD_ORDER: CanonicalField[] = [
  'studentId', 'studentName', 'program', 'classSection', 'semester',
  'courseCode', 'courseTitle', 'instructor', 'marks', 'grade', 'gradePoints', 'creditHours',
  'sgpa', 'cgpa', 'creditsAttempted', 'creditsEarned', 'ignore',
];

export function ColumnMappingTable({
  mapping,
  sampleRows,
  onChange,
}: {
  mapping: ColumnMapping[];
  sampleRows: string[][];
  onChange: (mapping: ColumnMapping[]) => void;
}) {
  const usedFields = new Set(mapping.filter((m) => m.mappedTo !== 'ignore').map((m) => m.mappedTo));

  function updateField(sourceIndex: number, field: CanonicalField) {
    onChange(
      mapping.map((m) => {
        if (m.sourceIndex === sourceIndex) return { ...m, mappedTo: field, confidence: 100 };
        // Prevent two columns from claiming the same field (except ignore).
        if (field !== 'ignore' && m.mappedTo === field) return { ...m, mappedTo: 'ignore', confidence: 0 };
        return m;
      }),
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Column in your file</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Sample values</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Maps to</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {mapping.map((m) => {
            const samples = sampleRows.map((r) => r[m.sourceIndex]).filter(Boolean).slice(0, 3);
            return (
              <tr key={m.sourceIndex}>
                <td className="px-3 py-2 font-medium text-slate-800">{m.sourceColumn}</td>
                <td className="px-3 py-2 text-slate-500">{samples.join(', ') || '—'}</td>
                <td className="px-3 py-2">
                  <select
                    value={m.mappedTo}
                    onChange={(e) => updateField(m.sourceIndex, e.target.value as CanonicalField)}
                    className={`w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none ${
                      m.mappedTo === 'ignore' ? 'border-slate-300 text-slate-400' : 'border-slate-400 text-slate-900'
                    }`}
                  >
                    {FIELD_ORDER.map((f) => (
                      <option key={f} value={f} disabled={f !== 'ignore' && f !== m.mappedTo && usedFields.has(f)}>
                        {CANONICAL_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
