/**
 * useIssues Hook
 *
 * Fetches and aggregates issues from all imported reports.
 */

import { useQuery } from '@tanstack/react-query';
import { detectAllIssues, type DetectedIssue } from '../../analysis/services/issue-detection.js';
import type { RuaReport } from '../../../shared/types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface AggregatedIssue extends DetectedIssue {
  id: string;
  reportId: string;
  reportName: string;
  domain: string;
  detectedAt: Date;
}

// ============================================================================
// Hook
// ============================================================================

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async (): Promise<AggregatedIssue[]> => {
      console.log('[ISSUES] Starting issue detection across all reports');

      // Get all reports
      const reports = await window.electronAPI.getReports();
      console.log(`[ISSUES] Found ${reports.length} reports to analyze`);

      const allIssues: AggregatedIssue[] = [];

      // Analyze each report for issues
      for (const reportSummary of reports) {
        try {
          // Skip non-RUA reports (check summary first to avoid unnecessary fetch)
          if (reportSummary.type !== 'rua') {
            console.log(`[ISSUES] Skipping non-RUA report: ${reportSummary.id} (type: ${reportSummary.type})`);
            continue;
          }

          console.log(`[ISSUES] Analyzing RUA report ${reportSummary.id} (${reportSummary.domain})`);

          // Get full report data
          const fullReport = await window.electronAPI.getReport(reportSummary.id);

          if (!fullReport) {
            console.warn(`[ISSUES] No data for report ${reportSummary.id}`);
            continue;
          }

          // Detect issues in this report
          const issues = detectAllIssues(fullReport as RuaReport);
          console.log(`[ISSUES] Found ${issues.length} issue(s) in report ${reportSummary.id}`);

          // Add report context to each issue
          for (const issue of issues) {
            allIssues.push({
              ...issue,
              id: `${reportSummary.id}-${issue.type}`,
              reportId: reportSummary.id,
              reportName: `${reportSummary.orgName}-${new Date(reportSummary.dateBegin).toISOString().split('T')[0]}`,
              domain: reportSummary.domain,
              detectedAt: new Date(reportSummary.dateEnd), // Use report end date, not import date
            });
          }
        } catch (error) {
          console.error(`[ISSUES] Failed to analyze report ${reportSummary.id}:`, error);
          if (error instanceof Error) {
            console.error(`[ISSUES] Error details:`, error.message, error.stack);
          }
        }
      }

      console.log(`[ISSUES] Total issues detected: ${allIssues.length}`);

      // Sort by severity and date
      return allIssues.sort((a, b) => {
        // Sort by severity first (critical > high > medium > low)
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        // Then by date (newest first)
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });
    },
    staleTime: 60000, // 1 minute
  });
}
