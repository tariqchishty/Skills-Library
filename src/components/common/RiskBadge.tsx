import type { RiskLevel } from '../../lib/types';

const STYLES: Record<RiskLevel, string> = {
  High: 'bg-red-100 text-red-800 ring-red-600/20',
  Medium: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  Low: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  None: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
};

const LABELS: Record<RiskLevel, string> = {
  High: 'High Risk',
  Medium: 'Medium Risk',
  Low: 'Low Risk',
  None: 'Good Standing',
};

export function RiskBadge({ level, small }: { level: RiskLevel; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${STYLES[level]} ${
        small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {LABELS[level]}
    </span>
  );
}
