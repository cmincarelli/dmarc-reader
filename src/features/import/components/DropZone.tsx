/**
 * Drop Zone Component
 *
 * A drag-and-drop area for importing DMARC report files.
 */

import { FileText, Upload } from 'lucide-react';
import { useDragDrop } from '../hooks/useDragDrop';
import { useFileImport } from '../hooks/useFileImport';

// ============================================================================
// Types
// ============================================================================

export interface DropZoneProps {
  onSuccess?: (report: any) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DropZone({ onSuccess, onError, className = '', disabled = false }: DropZoneProps) {
  const { importState, importMultipleFiles } = useFileImport({
    onSuccess,
    onError,
  });

  const { dragDropState, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop({
      onFilesDropped: (filePaths) => {
        if (!disabled && !importState.isImporting) {
          importMultipleFiles(filePaths);
        }
      },
      accept: ['.xml'],
      maxFiles: 10,
    });

  const isActive = dragDropState.isDragging && !disabled && !importState.isImporting;
  const isValid = dragDropState.isValidDrop;
  const isDisabled = disabled || importState.isImporting;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-lg border-2 border-dashed transition-all duration-200
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${
          isActive
            ? isValid
              ? 'border-blue-500 bg-blue-50'
              : 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }
        ${className}
      `}
    >
      <div className="flex flex-col items-center justify-center p-12 text-center">
        {importState.isImporting ? (
          <>
            <Upload className="w-12 h-12 text-blue-500 mb-4 animate-pulse" />
            <p className="text-lg font-medium text-gray-700 mb-2">Importing files...</p>
            <p className="text-sm text-gray-500">Please wait while we process your DMARC reports</p>
          </>
        ) : (
          <>
            <FileText
              className={`w-12 h-12 mb-4 ${
                isActive ? (isValid ? 'text-blue-500' : 'text-red-500') : 'text-gray-400'
              }`}
            />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isActive
                ? isValid
                  ? 'Drop files to import'
                  : 'Invalid file type'
                : 'Drop DMARC reports here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {isActive
                ? isValid
                  ? 'Release to start importing'
                  : 'Only .xml files are supported'
                : 'or click the import button above'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">.xml</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                Max 10 files
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                RUA & RUF supported
              </span>
            </div>
          </>
        )}

        {importState.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{importState.error}</p>
          </div>
        )}

        {importState.result && !importState.error && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              Successfully imported: {importState.result.filename}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
