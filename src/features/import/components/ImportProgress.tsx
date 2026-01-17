/**
 * Import Progress Component
 *
 * Displays the current status and progress of file import operations.
 */

import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import type { ImportState } from '../hooks/useFileImport';

// ============================================================================
// Types
// ============================================================================

export interface ImportProgressProps {
  importState: ImportState;
  onDismiss?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ImportProgress({ importState, onDismiss, className = '' }: ImportProgressProps) {
  const { isImporting, progress, error, result } = importState;

  // Don't render if nothing is happening
  if (!isImporting && !error && !result) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isImporting && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          {!isImporting && error && <XCircle className="w-5 h-5 text-red-500" />}
          {!isImporting && !error && result && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {isImporting && 'Importing DMARC Report...'}
            {!isImporting && error && 'Import Failed'}
            {!isImporting && !error && result && 'Import Successful'}
          </h4>

          {/* Description */}
          {isImporting && <p className="text-sm text-gray-500">Processing file, please wait...</p>}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!isImporting && !error && result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{result.filename}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Type:</span> {result.type.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium">Domain:</span> {result.domain}
                </div>
                <div>
                  <span className="font-medium">Organization:</span> {result.orgName}
                </div>
                <div>
                  <span className="font-medium">Report ID:</span> {result.reportId.substring(0, 12)}
                  ...
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && !isImporting && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
