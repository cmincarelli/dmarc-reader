/**
 * Filters State Store
 *
 * Manages filter state for reports and analysis.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface ReportFilters {
  dateRange: DateRange;
  domains: string[];
  reportType: 'all' | 'rua' | 'ruf';
  searchQuery: string;
}

interface FiltersState {
  // Report filters
  reportFilters: ReportFilters;
  setReportFilters: (filters: Partial<ReportFilters>) => void;
  resetReportFilters: () => void;

  // Date range shortcuts
  setDateRangeLast7Days: () => void;
  setDateRangeLast30Days: () => void;
  setDateRangeLast90Days: () => void;

  // Domain filter
  addDomainFilter: (domain: string) => void;
  removeDomainFilter: (domain: string) => void;
  clearDomainFilters: () => void;
}

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_FILTERS: ReportFilters = {
  dateRange: {
    start: null,
    end: null,
  },
  domains: [],
  reportType: 'all',
  searchQuery: '',
};

// ============================================================================
// Store
// ============================================================================

export const useFiltersStore = create<FiltersState>((set) => ({
  // Report filters
  reportFilters: DEFAULT_FILTERS,

  setReportFilters: (filters) =>
    set((state) => ({
      reportFilters: { ...state.reportFilters, ...filters },
    })),

  resetReportFilters: () => set({ reportFilters: DEFAULT_FILTERS }),

  // Date range shortcuts
  setDateRangeLast7Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        dateRange: { start, end },
      },
    }));
  },

  setDateRangeLast30Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        dateRange: { start, end },
      },
    }));
  },

  setDateRangeLast90Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        dateRange: { start, end },
      },
    }));
  },

  // Domain filters
  addDomainFilter: (domain) =>
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        domains: [...state.reportFilters.domains, domain],
      },
    })),

  removeDomainFilter: (domain) =>
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        domains: state.reportFilters.domains.filter((d) => d !== domain),
      },
    })),

  clearDomainFilters: () =>
    set((state) => ({
      reportFilters: {
        ...state.reportFilters,
        domains: [],
      },
    })),
}));
