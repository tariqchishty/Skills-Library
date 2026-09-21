import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StudentRecord } from '../../lib/types';
import { CHART_COLORS } from '../../lib/chartColors';

const AXIS_STYLE = { fontSize: 11, fill: CHART_COLORS.muted };

export function StudentTrendChart({ student }: { student: StudentRecord }) {
  const data = student.semesters.map((s) => ({
    semester: s.semester,
    sgpa: s.computedSgpa ?? s.sgpa,
    cgpa: s.computedCgpa ?? s.cgpa,
  }));

  if (data.length < 2) {
    return <div className="flex h-40 items-center justify-center text-xs text-slate-400">Not enough semesters for a trend</div>;
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.gridline} vertical={false} />
          <XAxis dataKey="semester" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
          <YAxis domain={[0, 4]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="sgpa" name="SGPA" stroke={CHART_COLORS.categorical.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="cgpa" name="CGPA" stroke={CHART_COLORS.categorical.orange} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
