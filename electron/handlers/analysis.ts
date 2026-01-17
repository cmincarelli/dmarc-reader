/**
 * Analysis IPC Handlers
 *
 * Handles analysis operations for DMARC reports.
 * Runs analysis services and returns results to the renderer.
 */

import { ipcMain } from 'electron';
import { getDatabase, reports } from '../utils/database.js';
import { eq } from 'drizzle-orm';
import type { RuaReport } from '../../src/shared/types/index.js';
import {
  calculateAuthStats,
  getTopSources,
  generateReportSummary,
  createTimeSeries,
  aggregateByDomain,
  type AuthResultStats,
  type SourceStats,
} from '../../src/features/analysis/services/aggregation.js';
import {
  detectAllIssues,
  calculateHealthScore,
  type DetectedIssue,
} from '../../src/features/analysis/services/issue-detection.js';
import {
  generateRecommendations,
  type Recommendation,
} from '../../src/features/analysis/services/recommendations.js';

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyzes a single report
 */
async function analyzeReport(reportId: string): Promise<{
  authStats: AuthResultStats;
  topSources: SourceStats[];
  issues: DetectedIssue[];
  recommendations: Recommendation[];
  healthScore: number;
  summary: ReturnType<typeof generateReportSummary>;
} | null> {
  const db = getDatabase();

  try {
    console.log(`[ANALYSIS] Starting analysis for report: ${reportId}`);
    const result = db.select().from(reports).where(eq(reports.id, reportId)).get();

    if (!result) {
      console.log(`[ANALYSIS] Report not found: ${reportId}`);
      return null;
    }

    console.log(`[ANALYSIS] Parsing report data for: ${reportId}`);
    const report = JSON.parse(result.parsedData) as RuaReport;
    console.log(
      `[ANALYSIS] Report parsed successfully. Org: ${report.reportMetadata.orgName}, Records: ${report.records.length}`
    );

    // Run all analysis functions with individual error handling
    console.log(`[ANALYSIS] Calculating auth stats...`);
    const authStats = calculateAuthStats(report.records);

    console.log(`[ANALYSIS] Getting top sources...`);
    const topSources = getTopSources(report.records, 10);

    console.log(`[ANALYSIS] Detecting issues...`);
    const issues = detectAllIssues(report);

    console.log(`[ANALYSIS] Generating recommendations...`);
    const recommendations = generateRecommendations(report);

    console.log(`[ANALYSIS] Calculating health score...`);
    const healthScore = calculateHealthScore(report);

    console.log(`[ANALYSIS] Generating summary...`);
    const summary = generateReportSummary(report);

    console.log(`[ANALYSIS] Analysis complete for report: ${reportId}`);
    return {
      authStats,
      topSources,
      issues,
      recommendations,
      healthScore,
      summary,
    };
  } catch (error) {
    console.error(`[ANALYSIS] Failed to analyze report ${reportId}:`, error);
    console.error('[ANALYSIS] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw new Error(
      `Failed to analyze report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detects issues in a report
 */
async function detectIssuesInReport(reportId: string): Promise<DetectedIssue[]> {
  const db = getDatabase();

  try {
    const result = db.select().from(reports).where(eq(reports.id, reportId)).get();

    if (!result) {
      return [];
    }

    const report = JSON.parse(result.parsedData) as RuaReport;
    return detectAllIssues(report);
  } catch (error) {
    console.error('Failed to detect issues:', error);
    throw new Error(
      `Failed to detect issues: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets recommendations for a report
 */
async function getRecommendationsForReport(reportId: string): Promise<Recommendation[]> {
  const db = getDatabase();

  try {
    const result = db.select().from(reports).where(eq(reports.id, reportId)).get();

    if (!result) {
      return [];
    }

    const report = JSON.parse(result.parsedData) as RuaReport;
    return generateRecommendations(report);
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    throw new Error(
      `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Aggregates multiple reports
 */
async function aggregateReports(reportIds: string[]): Promise<{
  authStats: AuthResultStats;
  topSources: SourceStats[];
  domainStats: ReturnType<typeof aggregateByDomain>;
  timeSeries: ReturnType<typeof createTimeSeries>;
  totalEmails: number;
  totalReports: number;
} | null> {
  const db = getDatabase();

  try {
    const allReports: RuaReport[] = [];
    let totalEmails = 0;

    for (const reportId of reportIds) {
      const result = db.select().from(reports).where(eq(reports.id, reportId)).get();

      if (result) {
        const report = JSON.parse(result.parsedData) as RuaReport;
        allReports.push(report);
        totalEmails += report.records.reduce((sum, r) => sum + r.row.count, 0);
      }
    }

    if (allReports.length === 0) {
      return null;
    }

    // Combine all records
    const allRecords = allReports.flatMap((r) => r.records);

    // Run aggregation functions
    const authStats = calculateAuthStats(allRecords);
    const topSources = getTopSources(allRecords, 20);
    const domainStats = aggregateByDomain(allReports);
    const timeSeries = createTimeSeries(allReports);

    return {
      authStats,
      topSources,
      domainStats,
      timeSeries,
      totalEmails,
      totalReports: allReports.length,
    };
  } catch (error) {
    console.error('Failed to aggregate reports:', error);
    throw new Error(
      `Failed to aggregate reports: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets trend data for a domain
 */
async function getTrendsForDomain(
  domain: string,
  days: number = 30
): Promise<ReturnType<typeof createTimeSeries>> {
  const db = getDatabase();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

    const results = db
      .select()
      .from(reports)
      .where(eq(reports.domain, domain))
      .all()
      .filter((r) => r.dateEnd >= cutoffTimestamp);

    const domainReports = results.map((r) => JSON.parse(r.parsedData) as RuaReport);

    return createTimeSeries(domainReports);
  } catch (error) {
    console.error('Failed to get trends:', error);
    throw new Error(
      `Failed to get trends: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

/**
 * Registers all analysis IPC handlers
 */
export function registerAnalysisHandlers(): void {
  // Analyze a single report
  ipcMain.handle('analysis:analyze-report', async (_event, reportId: string) => {
    return await analyzeReport(reportId);
  });

  // Detect issues in a report
  ipcMain.handle('analysis:detect-issues', async (_event, reportId: string) => {
    return await detectIssuesInReport(reportId);
  });

  // Get recommendations for a report
  ipcMain.handle('analysis:get-recommendations', async (_event, reportId: string) => {
    return await getRecommendationsForReport(reportId);
  });

  // Aggregate multiple reports
  ipcMain.handle('analysis:aggregate', async (_event, reportIds: string[]) => {
    return await aggregateReports(reportIds);
  });

  // Get trends for a domain
  ipcMain.handle('analysis:get-trends', async (_event, domain: string, days?: number) => {
    return await getTrendsForDomain(domain, days);
  });
}
