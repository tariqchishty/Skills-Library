import type { StudentRecord } from '../../lib/types';
import { StudentTrendChart } from './StudentTrendChart';

export function StudentDetailPanel({ student }: { student: StudentRecord }) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">SGPA / CGPA Trend</div>
        <StudentTrendChart student={student} />
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Course History</div>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-2 py-1.5 text-left">Semester</th>
                <th className="px-2 py-1.5 text-left">Course</th>
                <th className="px-2 py-1.5 text-left">Instructor</th>
                <th className="px-2 py-1.5 text-right">Credit Hrs</th>
                <th className="px-2 py-1.5 text-right">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {student.semesters.flatMap((sem) =>
                sem.courses.length > 0
                  ? sem.courses.map((c, i) => (
                      <tr key={`${sem.semester}-${i}`}>
                        <td className="px-2 py-1.5 text-slate-500">{sem.semester}</td>
                        <td className="px-2 py-1.5 font-medium text-slate-800">
                          {c.courseCode}
                          {c.courseTitle ? ` — ${c.courseTitle}` : ''}
                        </td>
                        <td className="px-2 py-1.5 text-slate-500">{c.instructor || '—'}</td>
                        <td className="px-2 py-1.5 text-right text-slate-500">{c.creditHours ?? '—'}</td>
                        <td
                          className={`px-2 py-1.5 text-right font-semibold ${
                            c.isFail ? 'text-red-600' : c.isNonGraded ? 'text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {c.isNonGraded ? c.nonGradedType ?? 'Ungraded' : c.grade || '—'}
                        </td>
                      </tr>
                    ))
                  : [
                      <tr key={sem.semester}>
                        <td className="px-2 py-1.5 text-slate-500">{sem.semester}</td>
                        <td className="px-2 py-1.5 text-slate-500" colSpan={4}>
                          SGPA {sem.sgpa?.toFixed(2) ?? '—'} · CGPA {sem.cgpa?.toFixed(2) ?? '—'} (summary row, no course detail)
                        </td>
                      </tr>,
                    ],
              )}
            </tbody>
          </table>
        </div>
      </div>
      {student.riskFlags.length > 0 && (
        <div className="lg:col-span-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Flags</div>
          <ul className="space-y-1">
            {student.riskFlags.map((f, i) => (
              <li key={i} className="rounded-md bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
