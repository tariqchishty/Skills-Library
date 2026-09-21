import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../state/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { StatCard } from '../components/common/StatCard';
import { filterStudents } from '../lib/filters';
import {
  cgpaHistogramBuckets,
  cohortTrend,
  overallGradeDistribution,
  riskLevelBreakdown,
} from '../lib/reportAggregation';
import { CHART_COLORS, RISK_COLORS } from '../lib/chartColors';

const AXIS_STYLE = { fontSize: 12, fill: CHART_COLORS.muted };

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-800">{title}</div>
      {empty ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">Not enough data yet</div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { students, settings, filters, setFilters } = useApp();
  const filtered = useMemo(() => filterStudents(students, filters), [students, filters]);

  const totalStudents = filtered.length;
  const highRisk = filtered.filter((s) => s.riskLevel === 'High').length;
  const mediumRisk = filtered.filter((s) => s.riskLevel === 'Medium').length;
  const cgpas = filtered.map((s) => s.latestCgpa).filter((v): v is number => v !== null);
  const avgCgpa = cgpas.length ? (cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) : '—';
  const failCount = filtered.reduce((sum, s) => sum + s.totalFailedCourses, 0);

  const gradeDist = useMemo(() => {
    const dist = overallGradeDistribution(filtered);
    const order = settings.gradeScale.map((g) => g.grade);
    return order.filter((g) => dist[g] !== undefined).map((g) => ({ grade: g, count: dist[g] }));
  }, [filtered, settings.gradeScale]);

  const cgpaHist = useMemo(() => cgpaHistogramBuckets(filtered), [filtered]);
  const riskBreakdown = useMemo(
    () => riskLevelBreakdown(filtered).filter((r) => r.count > 0),
    [filtered],
  );
  const trend = useMemo(() => cohortTrend(filtered), [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Cohort-wide snapshot of academic performance and risk.</p>

      <div className="mt-5">
        <FilterBar students={students} filters={filters} onChange={setFilters} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Students" value={totalStudents} />
        <StatCard label="High Risk" value={highRisk} accent={RISK_COLORS.High} />
        <StatCard label="Medium Risk" value={mediumRisk} accent={RISK_COLORS.Medium} />
        <StatCard label="Average CGPA" value={avgCgpa} />
        <StatCard label="Failed Courses" value={failCount} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Grade Distribution" empty={gradeDist.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeDist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
              <XAxis dataKey="grade" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Courses" fill={CHART_COLORS.categorical.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CGPA Distribution" empty={cgpaHist.every((b) => b.count === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cgpaHist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
              <XAxis dataKey="bucket" tick={{ ...AXIS_STYLE, fontSize: 11 }} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" name="Students" fill={CHART_COLORS.categorical.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Level Breakdown" empty={riskBreakdown.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskBreakdown}
                dataKey="count"
                nameKey="level"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                label={(entry: any) => `${entry.level}: ${entry.count}`}
              >
                {riskBreakdown.map((r) => (
                  <Cell key={r.level} fill={RISK_COLORS[r.level as keyof typeof RISK_COLORS]} stroke={CHART_COLORS.surface} strokeWidth={2} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cohort Trend (Avg SGPA / CGPA by Semester)" empty={trend.length < 2}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
              <XAxis dataKey="semester" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <YAxis domain={[0, 4]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgSgpa" name="Avg SGPA" stroke={CHART_COLORS.categorical.blue} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="avgCgpa" name="Avg CGPA" stroke={CHART_COLORS.categorical.orange} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
