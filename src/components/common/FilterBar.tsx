import type { StudentRecord } from '../../lib/types';
import { EMPTY_FILTERS, uniqueInstructors, uniqueOptions, uniqueSemesters, type Filters } from '../../lib/filters';

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  students,
  filters,
  onChange,
  showRisk = true,
  showSearch = true,
}: {
  students: StudentRecord[];
  filters: Filters;
  onChange: (f: Filters) => void;
  showRisk?: boolean;
  showSearch?: boolean;
}) {
  const programs = uniqueOptions(students, (s) => s.program);
  const classes = uniqueOptions(students, (s) => s.classSection);
  const semesters = uniqueSemesters(students);
  const instructors = uniqueInstructors(students);
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <Select label="Program" value={filters.program} onChange={(v) => onChange({ ...filters, program: v })} options={programs} />
      <Select label="Class / Section" value={filters.classSection} onChange={(v) => onChange({ ...filters, classSection: v })} options={classes} />
      <Select label="Semester" value={filters.semester} onChange={(v) => onChange({ ...filters, semester: v })} options={semesters} />
      <Select label="Instructor" value={filters.instructor} onChange={(v) => onChange({ ...filters, instructor: v })} options={instructors} />
      {showRisk && (
        <Select
          label="Risk Level"
          value={filters.riskLevel}
          onChange={(v) => onChange({ ...filters, riskLevel: v as Filters['riskLevel'] })}
          options={['High', 'Medium', 'Low', 'None']}
        />
      )}
      {showSearch && (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Search
          <input
            type="text"
            placeholder="Name or ID..."
            className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </label>
      )}
      {dirty && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 underline hover:text-slate-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
