/**
 * Import Button Component
 *
 * A button that triggers the file selection dialog for importing DMARC reports.
 */

import { Upload } from 'lucide-react';
import { useFileImport } from '../hooks/useFileImport';

// ============================================================================
// Types
// ============================================================================

export interface ImportButtonProps {
  onSuccess?: (report: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ImportButton({
  onSuccess,
  onError,
  className = '',
  disabled = false,
}: ImportButtonProps) {
  const { importState, selectAndImport } = useFileImport({
    onSuccess,
    onError,
  });

  const handleClick = () => {
    if (!importState.isImporting && !disabled) {
      selectAndImport();
    }
  };

  const isDisabled = disabled || importState.isImporting;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        font-medium transition-colors duration-200
        ${
          isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }
        ${className}
      `}
    >
      <Upload className={`w-4 h-4 ${importState.isImporting ? 'animate-pulse' : ''}`} />
      <span>{importState.isImporting ? 'Importing...' : 'Import Report'}</span>
    </button>
  );
}
