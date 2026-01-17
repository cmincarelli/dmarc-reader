/**
 * Electron API Type Declarations
 *
 * These types define the API surface exposed by the preload script
 * to the renderer process via the context bridge.
 */

import type { ElectronAPI } from '../../electron/preload.mjs';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Re-export types for convenience
export type {
  StoredReport,
  ImportResult,
  FileValidationResult,
  ReportFilters,
  AppSettings,
} from '../../electron/preload.mjs';
