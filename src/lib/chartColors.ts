// Palette values from the dataviz skill's validated reference (light mode).
export const CHART_COLORS = {
  surface: '#fcfcfb',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#898781',
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  categorical: {
    blue: '#2a78d6',
    orange: '#eb6834',
    aqua: '#1baf7a',
    yellow: '#eda100',
    magenta: '#e87ba4',
    green: '#008300',
    violet: '#4a3aa7',
    red: '#e34948',
  },
  status: {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
  },
} as const;

export const RISK_COLORS: Record<'High' | 'Medium' | 'Low' | 'None', string> = {
  High: CHART_COLORS.status.critical,
  Medium: CHART_COLORS.status.warning,
  Low: CHART_COLORS.categorical.blue,
  None: CHART_COLORS.status.good,
};
