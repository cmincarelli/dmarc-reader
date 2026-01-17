/**
 * Dashboard Component
 *
 * Main dashboard view displaying DMARC report analysis with metrics,
 * charts, issues, and recommendations.
 */

import { Mail, Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { AuthPassRateChart } from './AuthPassRateChart';
import { IssueList } from './IssueList';
import { RecommendationList } from './RecommendationList';
import { useReportAnalysis } from '../hooks/useReportAnalysis';

// ============================================================================
// Types
// ============================================================================

export interface DashboardProps {
  reportId: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function Dashboard({ reportId, className = '' }: DashboardProps) {
  const { data, isLoading, error } = useReportAnalysis(reportId);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Analyzing report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isRufReport = error.includes('RUF') || error.includes('forensic');

    return (
      <div className={`bg-${isRufReport ? 'blue' : 'red'}-50 dark:bg-${isRufReport ? 'blue' : 'red'}-900/20 border border-${isRufReport ? 'blue' : 'red'}-200 dark:border-${isRufReport ? 'blue' : 'red'}-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 text-${isRufReport ? 'blue' : 'red'}-600 dark:text-${isRufReport ? 'blue' : 'red'}-400 flex-shrink-0 mt-1`} />
          <div>
            <h3 className={`font-semibold text-${isRufReport ? 'blue' : 'red'}-900 dark:text-${isRufReport ? 'blue' : 'red'}-100 mb-1`}>
              {isRufReport ? 'RUF Report - Limited Analysis' : 'Analysis Error'}
            </h3>
            <p className={`text-sm text-${isRufReport ? 'blue' : 'red'}-700 dark:text-${isRufReport ? 'blue' : 'red'}-200 mb-2`}>{error}</p>
            {isRufReport ? (
              <div className={`text-xs text-${isRufReport ? 'blue' : 'red'}-600 dark:text-${isRufReport ? 'blue' : 'red'}-300`}>
                <p className="mb-2">RUF (forensic) reports contain individual failure examples, not aggregate statistics.</p>
                <p className="font-semibold">To see full analysis and issue detection, import RUA (aggregate) reports.</p>
              </div>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400">
                Check the console (View → Developer → DevTools) for more detailed error information.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">No analysis data available.</p>
      </div>
    );
  }

  const { authStats, topSources, issues, recommendations, healthScore } = data;

  // Calculate stats for display
  const totalEmails = authStats.overall.total;
  const passRate = authStats.overall.passRate;
  const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
  const highPriorityRecs = recommendations.filter(
    (r) => r.priority === 'high' || r.priority === 'critical'
  ).length;

  // Determine overall health variant
  const getHealthVariant = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  // Determine pass rate variant
  const getPassRateVariant = (rate: number) => {
    if (rate >= 95) return 'success';
    if (rate >= 80) return 'warning';
    return 'danger';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Emails"
          value={totalEmails.toLocaleString()}
          subValue={`From ${topSources.length} sources`}
          icon={<Mail className="w-6 h-6 text-blue-600" />}
          variant="default"
        />

        <StatsCard
          label="Authentication Pass Rate"
          value={`${passRate.toFixed(1)}%`}
          subValue={`${authStats.overall.passed.toLocaleString()} passed`}
          icon={<Shield className="w-6 h-6 text-green-600" />}
          variant={getPassRateVariant(passRate)}
        />

        <StatsCard
          label="Health Score"
          value={healthScore}
          subValue={
            healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Needs Attention'
          }
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          variant={getHealthVariant(healthScore)}
        />

        <StatsCard
          label="Issues Detected"
          value={issues.length}
          subValue={criticalIssues > 0 ? `${criticalIssues} critical` : 'No critical issues'}
          icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
          variant={criticalIssues > 0 ? 'danger' : issues.length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Authentication Pass Rate Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Authentication Results</h3>
        <AuthPassRateChart data={authStats} />
      </div>

      {/* Top Sources */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Top Email Sources ({topSources.length})
        </h3>
        {topSources.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Source IP</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Emails</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Pass Rate</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">SPF</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">DKIM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {topSources.slice(0, 10).map((source, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 font-mono text-xs text-gray-900 dark:text-gray-100">{source.sourceIp}</td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{source.emailCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          source.passRate >= 95
                            ? 'text-green-600'
                            : source.passRate >= 80
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {source.passRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          source.spfPass >= 95
                            ? 'bg-green-100 text-green-800'
                            : source.spfPass >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {source.spfPass.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          source.dkimPass >= 95
                            ? 'bg-green-100 text-green-800'
                            : source.dkimPass >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {source.dkimPass.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">No source data available</p>
        )}
      </div>

      {/* Issues */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detected Issues</h3>
          {highPriorityRecs > 0 && (
            <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
              {highPriorityRecs} high priority{' '}
              {highPriorityRecs === 1 ? 'recommendation' : 'recommendations'}
            </span>
          )}
        </div>
        <IssueList issues={issues} />
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recommendations</h3>
        <RecommendationList recommendations={recommendations} />
      </div>
    </div>
  );
}
