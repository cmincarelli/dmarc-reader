/**
 * Issue List Component
 *
 * Displays detected issues with severity indicators and details.
 */

import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Issue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedRecords: number;
  affectedEmails: number;
  details: Record<string, unknown>;
}

export interface IssueListProps {
  issues: Issue[];
  className?: string;
  onIssueClick?: (issue: Issue) => void;
}

// ============================================================================
// Component
// ============================================================================

export function IssueList({ issues, className = '', onIssueClick }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Issues Detected</h3>
        <p className="text-gray-600 dark:text-gray-400">Your DMARC configuration looks good!</p>
      </div>
    );
  }

  const getSeverityIcon = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getSeverityBadge = (severity: Issue['severity']) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {issues.map((issue, index) => (
        <div
          key={index}
          onClick={() => onIssueClick?.(issue)}
          className={`
            border rounded-lg p-4 transition-all
            ${getSeverityColor(issue.severity)}
            ${onIssueClick ? 'cursor-pointer hover:shadow-md' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">{getSeverityIcon(issue.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{issue.title}</h4>
                {getSeverityBadge(issue.severity)}
              </div>
              <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>
                  <strong>{issue.affectedEmails.toLocaleString()}</strong> emails affected
                </span>
                <span>
                  <strong>{issue.affectedRecords}</strong>{' '}
                  {issue.affectedRecords === 1 ? 'record' : 'records'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
