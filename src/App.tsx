/**
 * Root Application Component
 */

import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { HomeView } from './features/home/components/HomeView';
import { ReportsView } from './features/reports/components/ReportsView';
import { Dashboard } from './features/analysis/components/Dashboard';
import { IssuesView } from './features/issues/components/IssuesView';
import { SettingsView } from './features/settings/components/SettingsView';
import { useUiStore } from './store/ui';
import { useTheme } from './hooks/useTheme';

// ============================================================================
// Component
// ============================================================================

function App() {
  const { currentView, setCurrentView, selectedReportId } = useUiStore();

  // Initialize theme on app startup
  useTheme();

  // Handle menu navigation events
  useEffect(() => {
    // Listen for navigation events from menu
    const unsubscribeNavigate = window.electronAPI.onNavigateTo((_event, view) => {
      setCurrentView(view as any);
    });

    // Listen for file import trigger from menu
    const unsubscribeImport = window.electronAPI.onFileImportTrigger(() => {
      // Trigger file import - navigate to home and trigger import
      setCurrentView('home');
      // Give it a moment to navigate, then trigger import
      setTimeout(() => {
        window.electronAPI.selectAndImportFile();
      }, 100);
    });

    // Listen for multiple file import trigger from menu
    const unsubscribeImportMultiple = window.electronAPI.onFileImportMultipleTrigger(() => {
      // For now, just trigger single import - can be enhanced later
      setCurrentView('home');
      setTimeout(() => {
        window.electronAPI.selectAndImportFile();
      }, 100);
    });

    return () => {
      unsubscribeNavigate();
      unsubscribeImport();
      unsubscribeImportMultiple();
    };
  }, [setCurrentView]);

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;

      case 'reports':
        return <ReportsView />;

      case 'dashboard':
        if (!selectedReportId) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                Please select a report from the Reports page to view details.
              </p>
            </div>
          );
        }
        return <Dashboard reportId={selectedReportId} />;

      case 'issues':
        return <IssuesView />;

      case 'settings':
        return <SettingsView />;

      default:
        return <HomeView />;
    }
  };

  // Get header title based on current view
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'home':
        return 'Home';
      case 'reports':
        return 'Reports';
      case 'dashboard':
        return 'Detail';
      case 'issues':
        return 'Issues';
      case 'settings':
        return 'Settings';
      default:
        return 'DMARC Reader';
    }
  };

  // Get header subtitle based on current view
  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'home':
        return 'Welcome to DMARC Reader';
      case 'reports':
        return 'View and manage imported reports';
      case 'dashboard':
        return 'Detailed analysis and metrics';
      case 'issues':
        return 'Monitor authentication issues';
      case 'settings':
        return 'Configure application settings';
      default:
        return undefined;
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={(view) => setCurrentView(view as typeof currentView)}
      headerTitle={getHeaderTitle()}
      headerSubtitle={getHeaderSubtitle()}
    >
      {renderView()}
    </AppLayout>
  );
}

export default App;
