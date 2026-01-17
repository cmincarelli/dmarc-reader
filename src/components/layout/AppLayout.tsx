/**
 * App Layout Component
 *
 * Main application layout with sidebar and content area.
 */

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// ============================================================================
// Types
// ============================================================================

export interface AppLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  headerTitle: string;
  headerSubtitle?: string;
  onImportClick?: () => void;
  children: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function AppLayout({
  currentView,
  onNavigate,
  headerTitle,
  headerSubtitle,
  onImportClick,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header title={headerTitle} subtitle={headerSubtitle} onImportClick={onImportClick} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900">{children}</main>
      </div>
    </div>
  );
}
