import { Fragment, useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { RiskBadge } from '../components/common/RiskBadge';
import { StudentDetailPanel } from '../components/risk/StudentDetailPanel';
import { filterStudents } from '../lib/filters';
import type { StudentRecord } from '../lib/types';

type SortKey = 'name' | 'id' | 'program' | 'cgpa' | 'risk';
type SortDir = 'asc' | 'desc';

const RISK_ORDER: Record<StudentRecord['riskLevel'], number> = { High: 3, Medium: 2, Low: 1, None: 0 };

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600 hover:text-slate-900"
    >
      {label} {active ? (dir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );
}

export function RiskListPage() {
  const { students, filters, setFilters } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [onlyAtRisk, setOnlyAtRisk] = useState(true);

  const filtered = useMemo(() => filterStudents(students, filters), [students, filters]);
  const base = onlyAtRisk ? filtered.filter((s) => s.riskLevel !== 'None') : filtered;

  const sorted = useMemo(() => {
    const list = [...base];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.studentName.localeCompare(b.studentName);
          break;
        case 'id':
          cmp = a.studentId.localeCompare(b.studentId);
          break;
        case 'program':
          cmp = a.program.localeCompare(b.program);
          break;
        case 'cgpa':
          cmp = (a.latestCgpa ?? -1) - (b.latestCgpa ?? -1);
          break;
        case 'risk':
          cmp = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [base, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Risk List</h1>
      <p className="mt-1 text-sm text-slate-500">
        Students flagged for academic risk, with the reason each was flagged. Click a row to see course history and
        trend.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <FilterBar students={students} filters={filters} onChange={setFilters} />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={onlyAtRisk} onChange={(e) => setOnlyAtRisk(e.target.checked)} />
          Show only flagged students
        </label>
      </div>

      <div className="mt-4 text-sm text-slate-500">{sorted.length} student{sorted.length === 1 ? '' : 's'}</div>

      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-8" />
              <SortHeader label="Student" sortKey="name" active={sortKey === 'name'} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="ID" sortKey="id" active={sortKey === 'id'} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Program" sortKey="program" active={sortKey === 'program'} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="CGPA" sortKey="cgpa" active={sortKey === 'cgpa'} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Risk" sortKey="risk" active={sortKey === 'risk'} dir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => (
              <Fragment key={s.studentId}>
                <tr
                  onClick={() => toggleExpand(s.studentId)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-2 text-center text-slate-400">{expanded.has(s.studentId) ? '▾' : '▸'}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{s.studentName}</td>
                  <td className="px-3 py-2 text-slate-500">{s.studentId}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {s.program}
                    {s.classSection ? ` · ${s.classSection}` : ''}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{s.latestCgpa?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2">
                    <RiskBadge level={s.riskLevel} small />
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-500" title={s.riskReason}>
                    {s.riskReason}
                  </td>
                </tr>
                {expanded.has(s.studentId) && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <StudentDetailPanel student={s} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-400">
                  No students match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
