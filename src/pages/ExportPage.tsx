import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../state/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { filterStudents } from '../lib/filters';
import { cgpaHistogramBuckets, overallGradeDistribution, riskLevelBreakdown } from '../lib/reportAggregation';
import { CHART_COLORS, RISK_COLORS } from '../lib/chartColors';
import { generatePdfReport } from '../lib/pdfExport';

const AXIS_STYLE = { fontSize: 12, fill: CHART_COLORS.muted };

export function ExportPage() {
  const { students, settings, filters, setFilters, summary } = useApp();
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [generating, setGenerating] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  const scoped = useMemo(() => {
    const base = filterStudents(students, filters);
    return atRiskOnly ? base.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Medium') : base;
  }, [students, filters, atRiskOnly]);

  const gradeDist = useMemo(() => {
    const dist = overallGradeDistribution(scoped);
    const order = settings.gradeScale.map((g) => g.grade);
    return order.filter((g) => dist[g] !== undefined).map((g) => ({ grade: g, count: dist[g] }));
  }, [scoped, settings.gradeScale]);

  const cgpaHist = useMemo(() => cgpaHistogramBuckets(scoped), [scoped]);
  const riskBreakdown = useMemo(() => riskLevelBreakdown(scoped).filter((r) => r.count > 0), [scoped]);

  async function handleDownload() {
    setGenerating(true);
    try {
      await generatePdfReport({
        students: scoped,
        summary,
        filters,
        atRiskOnly,
        chartsEl: chartsRef.current,
        institutionName,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Export Report</h1>
      <p className="mt-1 text-sm text-slate-500">
        Generate a printable PDF for an academic review meeting — cover page, summary stats, charts, and at-risk
        student tables.
      </p>

      <div className="mt-5 space-y-3">
        <FilterBar students={students} filters={filters} onChange={setFilters} showRisk />
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={atRiskOnly} onChange={(e) => setAtRiskOnly(e.target.checked)} />
            At-risk students only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Institution name (optional)
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g. Faculty of Computing"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{scoped.length}</span> student{scoped.length === 1 ? '' : 's'}{' '}
          will be included in this export.
        </div>
        <button
          onClick={handleDownload}
          disabled={generating || scoped.length === 0}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? 'Generating PDF…' : 'Download PDF Report'}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Preview</h2>
        <div ref={chartsRef} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-800">Grade Distribution</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
                  <XAxis dataKey="grade" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Courses" fill={CHART_COLORS.categorical.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-800">CGPA Distribution</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cgpaHist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ ...AXIS_STYLE, fontSize: 10 }} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Students" fill={CHART_COLORS.categorical.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-2 text-sm font-semibold text-slate-800">Risk Level Breakdown</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskBreakdown} dataKey="count" nameKey="level" innerRadius={45} outerRadius={75} paddingAngle={2} label={(entry: any) => `${entry.level}: ${entry.count}`}>
                    {riskBreakdown.map((r) => (
                      <Cell key={r.level} fill={RISK_COLORS[r.level as keyof typeof RISK_COLORS]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
