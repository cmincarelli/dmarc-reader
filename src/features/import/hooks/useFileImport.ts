/**
 * File Import Hook
 *
 * React hook for managing file import state and operations.
 * Provides a clean interface for importing DMARC reports.
 */

import { useState, useCallback } from 'react';
import type { ImportResult, StoredReport } from '../../../types/electron';

// ============================================================================
// Types
// ============================================================================

export interface ImportState {
  isImporting: boolean;
  progress: number;
  error: string | null;
  result: StoredReport | null;
}

export interface UseFileImportReturn {
  importState: ImportState;
  selectAndImport: () => Promise<void>;
  importFile: (filePath: string) => Promise<void>;
  importMultipleFiles: (filePaths: string[]) => Promise<void>;
  resetImport: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing file import operations
 *
 * @example
 * ```tsx
 * const { importState, selectAndImport } = useFileImport({
 *   onSuccess: (report) => console.log('Imported:', report.filename),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * <button onClick={selectAndImport}>Import File</button>
 * ```
 */
export function useFileImport(options?: {
  onSuccess?: (report: StoredReport) => void;
  onError?: (error: string) => void;
}): UseFileImportReturn {
  const [importState, setImportState] = useState<ImportState>({
    isImporting: false,
    progress: 0,
    error: null,
    result: null,
  });

  const resetImport = useCallback(() => {
    setImportState({
      isImporting: false,
      progress: 0,
      error: null,
      result: null,
    });
  }, []);

  const handleImportResult = useCallback(
    (result: ImportResult) => {
      if (result.success && result.report) {
        setImportState({
          isImporting: false,
          progress: 100,
          error: null,
          result: result.report,
        });
        options?.onSuccess?.(result.report);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';

        // Log detailed error information to console for debugging
        if (result.errorDetails) {
          console.error('[IMPORT] Error details:', result.errorDetails);
        }
        console.error('[IMPORT] Error message:', errorMessage);

        setImportState({
          isImporting: false,
          progress: 0,
          error: errorMessage,
          result: null,
        });
        options?.onError?.(errorMessage);
      }
    },
    [options]
  );

  const selectAndImport = useCallback(async () => {
    try {
      setImportState({
        isImporting: true,
        progress: 50,
        error: null,
        result: null,
      });

      const result = await window.electronAPI.selectAndImportFile();
      handleImportResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import file';
      setImportState({
        isImporting: false,
        progress: 0,
        error: errorMessage,
        result: null,
      });
      options?.onError?.(errorMessage);
    }
  }, [handleImportResult, options]);

  const importFile = useCallback(
    async (filePath: string) => {
      try {
        setImportState({
          isImporting: true,
          progress: 50,
          error: null,
          result: null,
        });

        const result = await window.electronAPI.importFile(filePath);
        handleImportResult(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to import file';
        setImportState({
          isImporting: false,
          progress: 0,
          error: errorMessage,
          result: null,
        });
        options?.onError?.(errorMessage);
      }
    },
    [handleImportResult, options]
  );

  const importMultipleFiles = useCallback(
    async (filePaths: string[]) => {
      try {
        setImportState({
          isImporting: true,
          progress: 0,
          error: null,
          result: null,
        });

        const results = await window.electronAPI.importMultipleFiles(filePaths);

        // Count successes and failures
        const successCount = results.filter((r: ImportResult) => r.success).length;
        const failureCount = results.length - successCount;

        if (failureCount > 0) {
          const errorMessage = `Imported ${successCount} of ${results.length} files. ${failureCount} failed.`;

          // Log details of each failed import
          console.error('[IMPORT] Failed imports:');
          results.forEach((result: ImportResult, index: number) => {
            if (!result.success) {
              console.error(`  [${index}] ${filePaths[index]}`);
              console.error(`     Error: ${result.error}`);
              if (result.errorDetails) {
                console.error(`     Details:`, result.errorDetails);
              }
            }
          });

          setImportState({
            isImporting: false,
            progress: 100,
            error: errorMessage,
            result: results.find((r: ImportResult) => r.success)?.report || null,
          });
          options?.onError?.(errorMessage);
        } else {
          setImportState({
            isImporting: false,
            progress: 100,
            error: null,
            result: results[results.length - 1]?.report || null,
          });

          // Call onSuccess for each successful import
          results.forEach((result: ImportResult) => {
            if (result.success && result.report) {
              options?.onSuccess?.(result.report);
            }
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to import files';
        setImportState({
          isImporting: false,
          progress: 0,
          error: errorMessage,
          result: null,
        });
        options?.onError?.(errorMessage);
      }
    },
    [handleImportResult, options]
  );

  return {
    importState,
    selectAndImport,
    importFile,
    importMultipleFiles,
    resetImport,
  };
}
