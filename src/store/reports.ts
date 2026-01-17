/**
 * Reports State Store
 *
 * Manages reports data with caching.
 */

import { create } from 'zustand';
import type { ReportSummary } from '../features/analysis/hooks/useReportList';

// ============================================================================
// Types
// ============================================================================

interface ReportsState {
  // Reports list
  reports: ReportSummary[];
  setReports: (reports: ReportSummary[]) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Refresh
  lastRefresh: Date | null;
  setLastRefresh: (date: Date) => void;

  // Actions
  addReport: (report: ReportSummary) => void;
  removeReport: (reportId: string) => void;
  clearReports: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useReportsStore = create<ReportsState>((set) => ({
  // Reports list
  reports: [],
  setReports: (reports) => set({ reports }),

  // Loading state
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Last refresh
  lastRefresh: null,
  setLastRefresh: (lastRefresh) => set({ lastRefresh }),

  // Actions
  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),

  removeReport: (reportId) =>
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== reportId),
    })),

  clearReports: () => set({ reports: [], error: null, lastRefresh: null }),
}));
