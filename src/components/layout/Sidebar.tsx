import { useApp, type Page } from '../../state/AppContext';

const NAV: { page: Page; label: string; icon: string; needsData?: boolean }[] = [
  { page: 'upload', label: 'Upload', icon: '⬆' },
  { page: 'dashboard', label: 'Overview Dashboard', icon: '◫', needsData: true },
  { page: 'risk', label: 'Risk List', icon: '⚠', needsData: true },
  { page: 'reports', label: 'Reports', icon: '▤', needsData: true },
  { page: 'export', label: 'Export', icon: '⬇', needsData: true },
];

export function Sidebar() {
  const { page, setPage, hasData, fileName, students, clearAll, settings, setPage: goto } = useApp();
  const atRisk = students.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Medium').length;

  return (
    <aside className="no-print flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
      <div className="px-5 py-6">
        <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Academic</div>
        <div className="text-xl font-bold leading-tight text-white">Results Intelligence</div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const disabled = item.needsData && !hasData;
          const active = page === item.page;
          return (
            <button
              key={item.page}
              disabled={disabled}
              onClick={() => setPage(item.page)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-white text-slate-900'
                  : disabled
                  ? 'cursor-not-allowed text-slate-600'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </span>
              {item.page === 'risk' && hasData && atRisk > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{atRisk}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 px-3 py-3">
        <button
          onClick={() => goto('settings')}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
            page === 'settings' ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span aria-hidden>⚙</span> Grading & Risk Settings
        </button>
      </div>

      <div className="border-t border-slate-800 px-4 py-4 text-xs text-slate-400">
        {fileName ? (
          <div className="mb-2 truncate" title={fileName}>
            File: <span className="text-slate-200">{fileName}</span>
          </div>
        ) : (
          <div className="mb-2">No data loaded</div>
        )}
        <div className="mb-3 text-[11px] text-slate-500">
          Data is processed in this browser session only and is not uploaded anywhere. It is discarded when you clear
          it or close this tab.
        </div>
        <button
          onClick={() => {
            if (!hasData || confirm('Clear all uploaded student data from this session? This cannot be undone.')) {
              clearAll();
            }
          }}
          disabled={!hasData}
          className="w-full rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear all data
        </button>
        <div className="mt-2 text-[10px] text-slate-600">
          Grade scale: {settings.gradeScale.length} bands · Pass floor {settings.risk.minPassingGradePoints.toFixed(2)} GP
        </div>
      </div>
    </aside>
  );
}
