/**
 * Report List Hook
 *
 * React hook for fetching and managing the list of reports.
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ReportSummary {
  id: string;
  filename: string;
  type: 'rua' | 'ruf';
  orgName: string;
  reportId: string;
  domain: string;
  dateBegin: Date;
  dateEnd: Date;
  importedAt: Date;
  totalRecords?: number;
  totalEmails?: number;
}

export interface UseReportListResult {
  reports: ReportSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for fetching report summaries
 */
export function useReportList(limit?: number): UseReportListResult {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.getReportSummaries(limit);

      // Convert date strings to Date objects
      const converted = result.map((r: any) => ({
        ...r,
        dateBegin: new Date(r.dateBegin),
        dateEnd: new Date(r.dateEnd),
        importedAt: new Date(r.importedAt),
      }));

      setReports(converted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [limit]);

  return {
    reports,
    isLoading,
    error,
    refetch: fetchReports,
  };
}
