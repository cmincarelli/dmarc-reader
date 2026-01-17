/**
 * Vitest Setup File
 *
 * Global setup for all unit and integration tests.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest matchers
// expect.extend({});

// Mock Electron APIs for renderer process tests
global.window = global.window || ({} as Window & typeof globalThis);

if (!window.electronAPI) {
  // @ts-expect-error - Mocking electron API
  window.electronAPI = {
    selectFile: vi.fn(),
    importFile: vi.fn(),
    exportReport: vi.fn(),
    getReports: vi.fn(),
    getReport: vi.fn(),
    deleteReport: vi.fn(),
    getReportSummaries: vi.fn(),
    getDomains: vi.fn(),
    addDomain: vi.fn(),
    deleteDomain: vi.fn(),
    analyzeReport: vi.fn(),
    detectIssues: vi.fn(),
    getRecommendations: vi.fn(),
    aggregateReports: vi.fn(),
    getTrends: vi.fn(),
    lookupIp: vi.fn(),
    checkIpReputation: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getAppVersion: vi.fn(),
    openExternal: vi.fn(),
    onImportProgress: vi.fn(),
    onUpdateAvailable: vi.fn(),
    onUpdateDownloaded: vi.fn(),
  };
}
