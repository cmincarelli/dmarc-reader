/**
 * Hook for fetching global statistics across all reports
 */

import { useState, useEffect } from 'react';

export interface GlobalStats {
  totalReports: number;
  totalDomains: number;
  totalEmails: number;
  oldestReport: Date | null;
  newestReport: Date | null;
}

export interface UseGlobalStatsResult {
  stats: GlobalStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGlobalStats(): UseGlobalStatsResult {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await window.electronAPI.getGlobalStats();

      // Convert date strings back to Date objects if needed
      setStats({
        ...result,
        oldestReport: result.oldestReport ? new Date(result.oldestReport) : null,
        newestReport: result.newestReport ? new Date(result.newestReport) : null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch global stats';
      console.error('[GLOBAL-STATS] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
