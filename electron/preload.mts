/**
 * Electron Preload Script
 *
 * This script runs in a separate context and creates a secure bridge between
 * the main process and the renderer process. It exposes a limited, typed API
 * that the renderer can use to communicate with the main process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

// Debug: Log that preload script is running
console.log('[PRELOAD] Preload script starting...');

// ============================================================================
// Type Definitions
// ============================================================================

export interface StoredReport {
  id: string;
  filename: string;
  type: 'rua' | 'ruf';
  orgName: string;
  reportId: string;
  domain: string;
  dateBegin: Date;
  dateEnd: Date;
  importedAt: Date;
}

export interface ImportResult {
  success: boolean;
  report?: StoredReport;
  error?: string;
  errorDetails?: unknown;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  domain?: string;
  type?: 'rua' | 'ruf';
}

export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  autoImport?: boolean;
  autoImportFolder?: string;
  autoImportAction?: 'keep' | 'delete' | 'archive';
  notifications?: boolean;
  apiKeys?: {
    abuseIpDb?: string;
    virusTotal?: string;
  };
  databasePath?: string;
}

// ============================================================================
// Electron API
// ============================================================================

const electronAPI = {
  // ========================================================================
  // File Operations
  // ========================================================================

  /**
   * Opens file selection dialog and imports the selected file
   */
  selectAndImportFile: (): Promise<ImportResult> => {
    return ipcRenderer.invoke('file:select-and-import');
  },

  /**
   * Imports a DMARC report from a file path (for drag-and-drop)
   */
  importFile: (filePath: string): Promise<ImportResult> => {
    return ipcRenderer.invoke('file:import', filePath);
  },

  /**
   * Imports multiple DMARC reports at once
   */
  importMultipleFiles: (filePaths: string[]): Promise<ImportResult[]> => {
    return ipcRenderer.invoke('file:import-multiple', filePaths);
  },

  /**
   * Validates a file without importing it
   */
  validateFile: (filePath: string): Promise<FileValidationResult> => {
    return ipcRenderer.invoke('file:validate', filePath);
  },

  /**
   * Exports a report to CSV or JSON
   */
  exportReport: (
    reportId: string,
    format: 'csv' | 'json'
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke('file:export', reportId, format);
  },

  // ========================================================================
  // Database Operations
  // ========================================================================

  getReports: (filters?: ReportFilters): Promise<any[]> => {
    return ipcRenderer.invoke('db:get-reports', filters);
  },

  getReport: (reportId: string): Promise<any | null> => {
    return ipcRenderer.invoke('db:get-report', reportId);
  },

  deleteReport: (reportId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('db:delete-report', reportId);
  },

  getReportSummaries: (limit?: number): Promise<any[]> => {
    return ipcRenderer.invoke('db:get-report-summaries', limit);
  },

  getDomains: (): Promise<any[]> => {
    return ipcRenderer.invoke('db:get-domains');
  },

  addDomain: (domain: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('db:add-domain', domain);
  },

  deleteDomain: (domainId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('db:delete-domain', domainId);
  },

  getGlobalStats: (): Promise<{
    totalReports: number;
    totalDomains: number;
    totalEmails: number;
    oldestReport: Date | null;
    newestReport: Date | null;
  }> => {
    return ipcRenderer.invoke('db:get-global-stats');
  },

  // ========================================================================
  // Analysis Operations
  // ========================================================================

  analyzeReport: (reportId: string): Promise<any> => {
    return ipcRenderer.invoke('analysis:analyze-report', reportId);
  },

  detectIssues: (reportId: string): Promise<any[]> => {
    return ipcRenderer.invoke('analysis:detect-issues', reportId);
  },

  getRecommendations: (reportId: string): Promise<any[]> => {
    return ipcRenderer.invoke('analysis:get-recommendations', reportId);
  },

  aggregateReports: (reportIds: string[]): Promise<any> => {
    return ipcRenderer.invoke('analysis:aggregate', reportIds);
  },

  getTrends: (domain: string, days?: number): Promise<any> => {
    return ipcRenderer.invoke('analysis:get-trends', domain, days);
  },

  // ========================================================================
  // Geolocation Operations
  // ========================================================================

  lookupIp: (ip: string): Promise<any | null> => {
    return ipcRenderer.invoke('geo:lookup', ip);
  },

  checkIpReputation: (ip: string): Promise<any | null> => {
    return ipcRenderer.invoke('geo:check-reputation', ip);
  },

  // ========================================================================
  // Settings Operations
  // ========================================================================

  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke('settings:get');
  },

  updateSettings: (
    settings: Partial<AppSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('settings:update', settings);
  },

  getDatabaseStats: (): Promise<{
    size: number;
    sizeFormatted: string;
    location: string;
  }> => {
    return ipcRenderer.invoke('settings:get-db-stats');
  },

  clearAllData: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('settings:clear-data');
  },

  selectFolder: (): Promise<{ path?: string; canceled: boolean }> => {
    return ipcRenderer.invoke('settings:select-folder');
  },

  // ========================================================================
  // System Operations
  // ========================================================================

  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('system:version');
  },

  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('system:open-external', url);
  },

  // ========================================================================
  // Event Listeners
  // ========================================================================

  onImportProgress: (callback: (event: IpcRendererEvent, progress: number) => void) => {
    ipcRenderer.on('import:progress', callback);
    return () => {
      ipcRenderer.removeListener('import:progress', callback);
    };
  },

  onUpdateAvailable: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('update:available', callback);
    return () => {
      ipcRenderer.removeListener('update:available', callback);
    };
  },

  onUpdateDownloaded: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('update:downloaded', callback);
    return () => {
      ipcRenderer.removeListener('update:downloaded', callback);
    };
  },

  onNavigateTo: (callback: (event: IpcRendererEvent, view: string) => void) => {
    ipcRenderer.on('navigate-to', callback);
    return () => {
      ipcRenderer.removeListener('navigate-to', callback);
    };
  },

  onFileImportTrigger: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('file:import-trigger', callback);
    return () => {
      ipcRenderer.removeListener('file:import-trigger', callback);
    };
  },

  onFileImportMultipleTrigger: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('file:import-multiple-trigger', callback);
    return () => {
      ipcRenderer.removeListener('file:import-multiple-trigger', callback);
    };
  },
};

// ============================================================================
// Expose API to Renderer
// ============================================================================

console.log('[PRELOAD] Exposing electronAPI to main world...');
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('[PRELOAD] electronAPI exposed successfully');

// ============================================================================
// Type Export for Renderer
// ============================================================================

export type ElectronAPI = typeof electronAPI;
