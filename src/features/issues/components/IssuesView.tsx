/**
 * Issues View Component
 *
 * Aggregated view of all authentication issues across all reports.
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, XCircle, FileText, Filter } from 'lucide-react';
import { useIssues } from '../hooks/useIssues';
import { useUiStore } from '../../../store/ui';

// ============================================================================
// Types
// ============================================================================

type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
type IssueType =
  | 'spf_failure'
  | 'dkim_failure'
  | 'alignment_failure'
  | 'high_volume_failure'
  | 'suspicious_source'
  | 'policy_override'
  | 'partial_auth'
  | 'configuration_issue';

// ============================================================================
// Component
// ============================================================================

export function IssuesView() {
  const { data: allIssues = [], isLoading, error } = useIssues();
  const { setCurrentView, setSelectedReportId } = useUiStore();

  const [selectedSeverity, setSelectedSeverity] = useState<IssueSeverity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<IssueType | 'all'>('all');

  // Filter issues
  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
        return false;
      }
      if (selectedType !== 'all' && issue.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [allIssues, selectedSeverity, selectedType]);

  // Count by severity
  const severityCounts = useMemo(() => {
    return {
      critical: allIssues.filter((i) => i.severity === 'critical').length,
      high: allIssues.filter((i) => i.severity === 'high').length,
      medium: allIssues.filter((i) => i.severity === 'medium').length,
      low: allIssues.filter((i) => i.severity === 'low').length,
    };
  }, [allIssues]);

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView('dashboard');
  };

  const getSeverityIcon = (severity: IssueSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: IssueSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100';
    }
  };

  const getTypeLabel = (type: IssueType) => {
    switch (type) {
      case 'spf_failure':
        return 'SPF Failure';
      case 'dkim_failure':
        return 'DKIM Failure';
      case 'alignment_failure':
        return 'Alignment Issue';
      case 'high_volume_failure':
        return 'High Volume';
      case 'suspicious_source':
        return 'Suspicious Source';
      case 'policy_override':
        return 'Policy Override';
      case 'partial_auth':
        return 'Partial Auth';
      case 'configuration_issue':
        return 'Config Issue';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Analyzing reports for issues...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Issues</h3>
            <p className="text-sm text-red-700">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Issues</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Authentication problems detected across all reports</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{severityCounts.critical}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{severityCounts.high}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Medium</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{severityCounts.medium}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{severityCounts.low}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity</label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                    ${
                      selectedSeverity === severity
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issue Type</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                  ${
                    selectedType === 'all'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                All Types
              </button>
              {(['spf_failure', 'dkim_failure', 'alignment_failure'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                    ${
                      selectedType === type
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No issues found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {allIssues.length === 0
                ? 'Import RUA (aggregate) DMARC reports to see detected issues'
                : 'No issues match the selected filters'}
            </p>
            {allIssues.length === 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left max-w-2xl mx-auto">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 Need RUA Reports?</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Issue detection requires <strong>RUA (aggregate)</strong> reports, not RUF (forensic) reports.
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• RUA reports contain aggregate statistics and pass/fail rates</li>
                  <li>• RUF reports contain individual failure examples only</li>
                  <li>• Check your Reports page for blue "RUA" badges</li>
                  <li>• RUA reports are sent to the email address in your DMARC record's rua= tag</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`
                border-2 rounded-lg p-6 transition-all
                ${getSeverityColor(issue.severity)}
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getSeverityIcon(issue.severity)}</div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{issue.title}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">
                        {getTypeLabel(issue.type)}
                      </span>
                    </div>

                    <p className="text-sm mb-3">{issue.description}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <button
                          onClick={() => handleViewReport(issue.reportId)}
                          className="font-medium hover:underline"
                        >
                          {issue.reportName}
                        </button>
                      </div>
                      <span>•</span>
                      <span>{issue.domain}</span>
                      <span>•</span>
                      <span>{issue.affectedEmails.toLocaleString()} affected emails</span>
                      <span>•</span>
                      <span>{issue.detectedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleViewReport(issue.reportId)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  View Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
