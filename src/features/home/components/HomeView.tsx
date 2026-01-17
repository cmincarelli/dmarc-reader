/**
 * Home View Component
 *
 * Landing page with overview and quick actions.
 */

import { useReportList } from '../../analysis/hooks/useReportList';
import { useGlobalStats } from '../../analysis/hooks/useGlobalStats';
import { useUiStore } from '../../../store/ui';
import { useFileImport } from '../../import/hooks/useFileImport';
import { useDragDrop } from '../../import/hooks/useDragDrop';
import { FileText, BarChart3, AlertTriangle, Shield, Upload, ArrowRight } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function HomeView() {
  const { reports, isLoading } = useReportList(5); // Fetch latest 5 reports
  const { stats, isLoading: statsLoading } = useGlobalStats();
  const { setCurrentView, setSelectedReportId } = useUiStore();

  // File import hook
  const { selectAndImport, importMultipleFiles, importState } = useFileImport({
    onSuccess: (report) => {
      console.log('Successfully imported:', report.filename);
      // Optionally navigate to the reports view or show success message
    },
    onError: (error) => {
      console.error('Import failed:', error);
    },
  });

  // Drag and drop hook
  const { dragDropState, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop({
      onFilesDropped: (filePaths) => {
        if (!importState.isImporting) {
          importMultipleFiles(filePaths);
        }
      },
      accept: ['.xml'],
      maxFiles: 10,
    });

  const handleViewReports = () => {
    setCurrentView('reports');
  };

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('dashboard');
  };

  const getHealthBadge = (healthScore?: number, passRate?: number) => {
    if (healthScore === undefined || passRate === undefined) {
      return null;
    }

    let variant: 'success' | 'warning' | 'danger';
    let label: string;

    if (passRate >= 95) {
      variant = 'success';
      label = 'Excellent';
    } else if (passRate >= 80) {
      variant = 'warning';
      label = 'Good';
    } else {
      variant = 'danger';
      label = 'Issues';
    }

    const colors = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colors[variant]}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section with Drag & Drop */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white mb-8
          transition-all duration-200
          ${dragDropState.isDragging ? 'ring-4 ring-white ring-opacity-50 scale-[1.02]' : ''}
        `}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">DMARC Reader</h1>
            <p className="text-blue-100">
              {dragDropState.isDragging
                ? dragDropState.isValidDrop
                  ? 'Drop files to import'
                  : 'Only .xml files are supported'
                : 'Analyze DMARC reports and secure your email authentication'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={selectAndImport}
            disabled={importState.isImporting || dragDropState.isDragging}
            className="
              flex items-center gap-2 px-6 py-3
              bg-white text-blue-600 rounded-lg
              hover:bg-blue-50 transition-colors
              font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Upload className={`w-5 h-5 ${importState.isImporting ? 'animate-pulse' : ''}`} />
            {importState.isImporting ? 'Importing...' : 'Import DMARC Report'}
          </button>

          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <span>or drag & drop .xml files here</span>
          </div>
        </div>

        {importState.error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-300/30 rounded-lg">
            <p className="text-sm text-white">{importState.error}</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalReports.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <button
            onClick={handleViewReports}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            View all reports
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Emails Analyzed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalEmails.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">View detailed authentication insights</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Domains Monitored</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalDomains.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tracking email authentication across domains</p>
        </div>
      </div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Reports</h2>
            <button
              onClick={handleViewReports}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View all
            </button>
          </div>

          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleViewReport(report.id)}
                className="
                  flex items-center justify-between p-4
                  border border-gray-200 dark:border-gray-700 rounded-lg
                  hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20
                  transition-all cursor-pointer
                "
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{report.domain}</p>
                      {getHealthBadge(report.healthScore, report.passRate)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{report.orgName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {report.totalEmails?.toLocaleString() || 'N/A'} emails
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(report.dateEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started */}
      {reports.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Import DMARC Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload XML files from your email provider (Google Workspace, Microsoft 365, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Analyze Authentication</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View pass rates for SPF, DKIM, and overall email authentication
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Fix Issues</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get actionable recommendations with DNS records to improve your email security
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
