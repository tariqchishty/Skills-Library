import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { allCoursesForStudents, filterStudents } from '../lib/filters';
import { classWiseReport, instructorWiseReport, programWiseReport, type GroupStats } from '../lib/reportAggregation';

type Tab = 'class' | 'program' | 'instructor';

function GroupStatsTable({ rows, groupLabel }: { rows: GroupStats[]; groupLabel: string }) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No data for this view.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">{groupLabel}</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Students</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Avg CGPA</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Pass Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Failed Courses</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">High Risk</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Medium Risk</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Grade Distribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2 font-medium text-slate-900">{r.key}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.studentCount}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.avgCgpa?.toFixed(2) ?? '—'}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.passRate !== null ? `${r.passRate}%` : '—'}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.failCount}</td>
              <td className="px-3 py-2 text-right font-semibold text-red-600">{r.highRiskCount}</td>
              <td className="px-3 py-2 text-right font-semibold text-amber-600">{r.mediumRiskCount}</td>
              <td className="px-3 py-2 text-xs text-slate-500">
                {Object.entries(r.gradeDistribution)
                  .map(([g, c]) => `${g}:${c}`)
                  .join('  ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InstructorTable({ students, filters }: { students: ReturnType<typeof filterStudents>; filters: Parameters<typeof allCoursesForStudents>[1] }) {
  const rows = useMemo(() => instructorWiseReport(allCoursesForStudents(students, filters)), [students, filters]);
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        No instructor data available — this requires course-level data with an Instructor column (Layout A).
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Instructor</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Course</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Students</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Pass Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Failed</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Avg Marks</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Grade Distribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={`${r.instructor}-${r.courseCode}`}>
              <td className="px-3 py-2 font-medium text-slate-900">{r.instructor}</td>
              <td className="px-3 py-2 text-slate-700">
                {r.courseCode}
                {r.courseTitle ? ` — ${r.courseTitle}` : ''}
              </td>
              <td className="px-3 py-2 text-right text-slate-700">{r.studentCount}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.passRate !== null ? `${r.passRate}%` : '—'}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.failCount}</td>
              <td className="px-3 py-2 text-right text-slate-700">{r.avgMarks ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-slate-500">
                {Object.entries(r.gradeDistribution)
                  .map(([g, c]) => `${g}:${c}`)
                  .join('  ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
        Shown as objective pass-rate and grade-distribution statistics — not a ranked comparison between instructors.
      </p>
    </div>
  );
}

export function ReportsPage() {
  const { students, filters, setFilters, parsed } = useApp();
  const [tab, setTab] = useState<Tab>('class');
  const filtered = useMemo(() => filterStudents(students, filters), [students, filters]);

  const classRows = useMemo(() => classWiseReport(filtered), [filtered]);
  const programRows = useMemo(() => programWiseReport(filtered), [filtered]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'class', label: 'Class / Section-wise' },
    { id: 'program', label: 'Program-wise' },
    { id: 'instructor', label: 'Instructor-wise' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">Aggregate statistics for academic review meetings.</p>

      <div className="mt-5">
        <FilterBar students={students} filters={filters} onChange={setFilters} showRisk={false} showSearch={false} />
      </div>

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === t.id ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'class' && <GroupStatsTable rows={classRows} groupLabel="Class / Section" />}
        {tab === 'program' && <GroupStatsTable rows={programRows} groupLabel="Program" />}
        {tab === 'instructor' && (
          parsed?.layout === 'B' ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              This file uses the semester-summary layout, which doesn't include course-level instructor data.
            </div>
          ) : (
            <InstructorTable students={filtered} filters={filters} />
          )
        )}
      </div>
    </div>
  );
}
