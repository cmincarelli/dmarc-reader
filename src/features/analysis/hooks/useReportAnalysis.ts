/**
 * Report Analysis Hook
 *
 * React hook for fetching and managing report analysis data.
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisData {
  authStats: {
    dkim: { total: number; passed: number; failed: number; passRate: number };
    spf: { total: number; passed: number; failed: number; passRate: number };
    overall: { total: number; passed: number; failed: number; passRate: number };
  };
  topSources: Array<{
    sourceIp: string;
    count: number;
    emailCount: number;
    passRate: number;
    dkimPass: number;
    spfPass: number;
    disposition: string;
  }>;
  issues: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedRecords: number;
    affectedEmails: number;
    details: Record<string, unknown>;
  }>;
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: 'dns' | 'policy' | 'monitoring' | 'security';
    title: string;
    description: string;
    action: string;
    dnsRecords?: string[];
    relatedIssues: string[];
  }>;
  healthScore: number;
  summary: {
    metadata: {
      orgName: string;
      reportId: string;
      domain: string;
      dateRange: { begin: Date; end: Date };
      policy: string;
    };
    statistics: {
      totalRecords: number;
      totalEmails: number;
      passedRecords: number;
      failedRecords: number;
      partialRecords: number;
    };
  };
}

export interface UseReportAnalysisResult {
  data: AnalysisData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for fetching report analysis data
 */
export function useReportAnalysis(reportId: string | null): UseReportAnalysisResult {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!reportId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.analyzeReport(reportId);

      if (result) {
        // Convert date strings to Date objects
        const converted = {
          ...result,
          summary: {
            ...result.summary,
            metadata: {
              ...result.summary.metadata,
              dateRange: {
                begin: new Date(result.summary.metadata.dateRange.begin),
                end: new Date(result.summary.metadata.dateRange.end),
              },
            },
          },
        };
        setData(converted);
      } else {
        setError('Report not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [reportId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalysis,
  };
}
