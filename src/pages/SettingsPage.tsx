import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { DEFAULT_SETTINGS } from '../lib/defaultSettings';
import type { GradeBand } from '../lib/types';

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SettingsPage() {
  const { settings, setSettings } = useApp();
  const [local, setLocal] = useState(settings);
  const dirty = JSON.stringify(local) !== JSON.stringify(settings);

  function updateBand(index: number, patch: Partial<GradeBand>) {
    const gradeScale = local.gradeScale.map((b, i) => (i === index ? { ...b, ...patch } : b));
    setLocal({ ...local, gradeScale });
  }

  function addBand() {
    setLocal({
      ...local,
      gradeScale: [...local.gradeScale, { grade: 'NEW', minMarks: 0, maxMarks: 0, points: 0, status: 'Fail' }],
    });
  }

  function removeBand(index: number) {
    setLocal({ ...local, gradeScale: local.gradeScale.filter((_, i) => i !== index) });
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Grading Scheme & Risk Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Edit these to match your institution's examination notification — no code changes needed. Changes apply
        immediately across dashboards, risk detection, and reports.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Grade scale</h2>
        <p className="mb-3 text-sm text-slate-500">Used to convert marks to letter grades and grade points.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Grade</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Min %</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Max %</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Grade Points</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {local.gradeScale.map((band, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <input
                      value={band.grade}
                      onChange={(e) => updateBand(i, { grade: e.target.value })}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={band.minMarks}
                      onChange={(e) => updateBand(i, { minMarks: Number(e.target.value) })}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={band.maxMarks}
                      onChange={(e) => updateBand(i, { maxMarks: Number(e.target.value) })}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step={0.01}
                      value={band.points}
                      onChange={(e) => updateBand(i, { points: Number(e.target.value) })}
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={band.status}
                      onChange={(e) => updateBand(i, { status: e.target.value as GradeBand['status'] })}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="Pass">Pass</option>
                      <option value="Minimum pass">Minimum pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeBand(i)} className="text-xs font-medium text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 p-2">
            <button onClick={addBand} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              + Add grade band
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Risk thresholds</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <NumberField
            label="Minimum passing grade points"
            value={local.risk.minPassingGradePoints}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, minPassingGradePoints: v } })}
            hint="Below this = failed course"
          />
          <NumberField
            label="Low CGPA threshold"
            value={local.risk.lowCgpaThreshold}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, lowCgpaThreshold: v } })}
            hint="Below this = high risk / probation"
          />
          <NumberField
            label="Warning band upper bound"
            value={local.risk.warningBandUpper}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, warningBandUpper: v } })}
            hint="lowCgpa–this = medium risk"
          />
          <NumberField
            label="Declining SGPA drop threshold"
            value={local.risk.decliningDropThreshold}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, decliningDropThreshold: v } })}
            hint="Drop across 2 latest semesters"
          />
          <NumberField
            label="High-risk course count"
            value={local.risk.highRiskCourseCount}
            step={1}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, highRiskCourseCount: v } })}
            hint="Weak/failed grades in one term"
          />
          <NumberField
            label="Weak grade points ceiling"
            value={local.risk.weakGradePointsCeiling}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, weakGradePointsCeiling: v } })}
            hint="Grade points at/below = weak"
          />
          <NumberField
            label="Graduation-risk credits threshold"
            value={local.risk.graduationCreditsThreshold}
            step={1}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, graduationCreditsThreshold: v } })}
            hint="Credits earned to treat as final-year"
          />
          <NumberField
            label="CGPA mismatch tolerance"
            value={local.risk.cgpaMismatchTolerance}
            onChange={(v) => setLocal({ ...local, risk: { ...local.risk, cgpaMismatchTolerance: v } })}
            hint="Allowed diff vs. file-reported CGPA"
          />
        </div>
      </section>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setLocal(DEFAULT_SETTINGS)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset to HEC defaults
        </button>
        <button
          onClick={() => setSettings(local)}
          disabled={!dirty}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save & Recompute
        </button>
      </div>
    </div>
  );
}
