import { AppProvider, useApp } from './state/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import { RiskListPage } from './pages/RiskListPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';

function PageRouter() {
  const { page, hasData } = useApp();

  if (page !== 'upload' && page !== 'settings' && !hasData) {
    return <UploadPage />;
  }

  switch (page) {
    case 'upload':
      return <UploadPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'risk':
      return <RiskListPage />;
    case 'reports':
      return <ReportsPage />;
    case 'export':
      return <ExportPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <UploadPage />;
  }
}

function Shell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageRouter />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
