/**
 * UI State Store
 *
 * Manages UI state like current view, selected report, etc.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type ViewType = 'home' | 'reports' | 'dashboard' | 'issues' | 'settings';

interface UiState {
  // Current view
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Selected report for dashboard view
  selectedReportId: string | null;
  setSelectedReportId: (reportId: string | null) => void;

  // Import modal state
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useUiStore = create<UiState>((set) => ({
  // View state
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  // Selected report
  selectedReportId: null,
  setSelectedReportId: (reportId) => set({ selectedReportId: reportId }),

  // Import modal
  isImportModalOpen: false,
  openImportModal: () => set({ isImportModalOpen: true }),
  closeImportModal: () => set({ isImportModalOpen: false }),

  // Theme
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  // Sidebar
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
