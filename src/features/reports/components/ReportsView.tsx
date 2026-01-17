/**
 * Reports View Component
 *
 * Displays list of imported DMARC reports with filtering and sorting.
 */

import { useReportList } from '../../analysis/hooks/useReportList';
import { useUiStore } from '../../../store/ui';
import { FileText, Calendar, Building2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// Component
// ============================================================================

export function ReportsView() {
  const { reports, isLoading, error, refetch } = useReportList();
  const { setCurrentView, setSelectedReportId } = useUiStore();

  const handleReportClick = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('dashboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Reports</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
        <p className="text-gray-600 mb-6">Import your first DMARC report to get started.</p>
      </div>
    );
  }

  const getReportTypeBadge = (type: 'rua' | 'ruf') => {
    const colors = {
      rua: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      ruf: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[type]}`}>
        {type.toUpperCase()}
      </span>
    );
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
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[variant]}`}>
        {label} ({passRate.toFixed(0)}%)
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'} imported
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => handleReportClick(report.id)}
            className="
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5
              hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md
              transition-all cursor-pointer
            "
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {getReportTypeBadge(report.type)}
                {getHealthBadge(report.healthScore, report.passRate)}
              </div>
            </div>

            {/* Domain */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{report.domain}</h3>

            {/* Organization */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <Building2 className="w-4 h-4" />
              <span>{report.orgName}</span>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <Calendar className="w-4 h-4" />
              <span>
                {format(report.dateBegin, 'MMM dd')} - {format(report.dateEnd, 'MMM dd, yyyy')}
              </span>
            </div>

            {/* Stats */}
            {report.totalEmails !== undefined && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Emails</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {report.totalEmails.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
