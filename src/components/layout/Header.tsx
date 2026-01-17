/**
 * Header Component
 *
 * Application header with title and actions.
 */

import { Upload } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onImportClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function Header({ title, subtitle, onImportClick, className = '' }: HeaderProps) {
  return (
    <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onImportClick && (
            <button
              onClick={onImportClick}
              className="
                flex items-center gap-2 px-4 py-2
                bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors
                font-medium
              "
            >
              <Upload className="w-4 h-4" />
              Import Report
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
