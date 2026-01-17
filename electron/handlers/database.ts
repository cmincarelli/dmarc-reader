/**
 * Database IPC Handlers
 *
 * Handles database queries and report retrieval for the renderer process.
 */

import { ipcMain } from 'electron';
import { getDatabase, reports, records } from '../utils/database.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { RuaReport } from '../../src/shared/types/index.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  domain?: string;
  type?: 'rua' | 'ruf';
}

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
  passRate?: number; // Percentage of emails that passed DMARC
  healthScore?: number; // Overall health score 0-100
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Gets all reports with optional filters
 */
async function getReports(filters?: ReportFilters): Promise<ReportSummary[]> {
  const db = getDatabase();

  try {
    let query = db.select().from(reports);

    // Apply filters
    const conditions = [];

    if (filters?.dateRange) {
      const startTimestamp = Math.floor(filters.dateRange.start.getTime() / 1000);
      const endTimestamp = Math.floor(filters.dateRange.end.getTime() / 1000);
      conditions.push(gte(reports.dateBegin, startTimestamp));
      conditions.push(lte(reports.dateEnd, endTimestamp));
    }

    if (filters?.domain) {
      conditions.push(eq(reports.domain, filters.domain));
    }

    if (filters?.type) {
      conditions.push(eq(reports.type, filters.type));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Sort by report end date (newest reports first), then by import date
    const results = await query.orderBy(desc(reports.dateEnd), desc(reports.importedAt)).all();

    // Add health metrics for each report
    const summaries: ReportSummary[] = [];

    for (const row of results) {
      const reportRecords = db
        .select()
        .from(records)
        .where(eq(records.reportId, row.id))
        .all();

      const recordCount = reportRecords.length;
      const totalEmails = reportRecords.reduce((sum, r) => sum + r.count, 0);

      // Calculate pass rate from records
      let passRate: number | undefined;
      let healthScore: number | undefined;

      if (row.type === 'rua' && reportRecords.length > 0) {
        const passedEmails = reportRecords
          .filter((r) => r.spfResult === 'pass' && r.dkimResult === 'pass')
          .reduce((sum, r) => sum + r.count, 0);

        passRate = totalEmails > 0 ? (passedEmails / totalEmails) * 100 : 0;

        // Simple health score based on pass rate
        if (passRate >= 95) {
          healthScore = 90 + (passRate - 95);
        } else if (passRate >= 80) {
          healthScore = 70 + ((passRate - 80) / 15) * 20;
        } else {
          healthScore = (passRate / 80) * 70;
        }
        healthScore = Math.round(healthScore);
      }

      summaries.push({
        id: row.id,
        filename: row.filename,
        type: row.type as 'rua' | 'ruf',
        orgName: row.orgName,
        reportId: row.reportId,
        domain: row.domain,
        dateBegin: new Date(row.dateBegin * 1000),
        dateEnd: new Date(row.dateEnd * 1000),
        importedAt: new Date(row.importedAt * 1000),
        totalRecords: recordCount,
        totalEmails,
        passRate,
        healthScore,
      });
    }

    return summaries;
  } catch (error) {
    console.error('Failed to get reports:', error);
    throw new Error(
      `Failed to get reports: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets a single report by ID with full data
 */
async function getReportById(reportId: string): Promise<RuaReport | null> {
  const db = getDatabase();

  try {
    const result = db.select().from(reports).where(eq(reports.id, reportId)).get();

    if (!result) {
      return null;
    }

    // Parse the stored JSON data
    const parsedData = JSON.parse(result.parsedData) as RuaReport;

    return parsedData;
  } catch (error) {
    console.error('Failed to get report:', error);
    throw new Error(
      `Failed to get report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deletes a report and all associated records
 */
async function deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    const result = db.delete(reports).where(eq(reports.id, reportId)).run();

    if (result.changes === 0) {
      return {
        success: false,
        error: 'Report not found',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets report summaries with record counts
 */
async function getReportSummaries(limit?: number): Promise<ReportSummary[]> {
  const db = getDatabase();

  try {
    let query = db
      .select({
        id: reports.id,
        filename: reports.filename,
        type: reports.type,
        orgName: reports.orgName,
        reportId: reports.reportId,
        domain: reports.domain,
        dateBegin: reports.dateBegin,
        dateEnd: reports.dateEnd,
        importedAt: reports.importedAt,
      })
      .from(reports)
      .orderBy(desc(reports.dateEnd), desc(reports.importedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query.all();

    // Get record counts and calculate health metrics for each report
    const summaries: ReportSummary[] = [];

    for (const row of results) {
      const reportRecords = db
        .select()
        .from(records)
        .where(eq(records.reportId, row.id))
        .all();

      const recordCount = reportRecords.length;
      const totalEmails = reportRecords.reduce((sum, r) => sum + r.count, 0);

      // Calculate pass rate from records
      let passRate: number | undefined;
      let healthScore: number | undefined;

      if (row.type === 'rua' && reportRecords.length > 0) {
        // Count emails that passed both SPF and DKIM (DMARC pass)
        const passedEmails = reportRecords
          .filter((r) => {
            // Record stores spfResult and dkimResult as pass/fail strings
            return r.spfResult === 'pass' && r.dkimResult === 'pass';
          })
          .reduce((sum, r) => sum + r.count, 0);

        passRate = totalEmails > 0 ? (passedEmails / totalEmails) * 100 : 0;

        // Simple health score based on pass rate
        // 95%+ = excellent (90-100)
        // 80-95% = good (70-90)
        // <80% = needs attention (0-70)
        if (passRate >= 95) {
          healthScore = 90 + (passRate - 95);
        } else if (passRate >= 80) {
          healthScore = 70 + ((passRate - 80) / 15) * 20;
        } else {
          healthScore = (passRate / 80) * 70;
        }
        healthScore = Math.round(healthScore);
      }

      summaries.push({
        id: row.id,
        filename: row.filename,
        type: row.type as 'rua' | 'ruf',
        orgName: row.orgName,
        reportId: row.reportId,
        domain: row.domain,
        dateBegin: new Date(row.dateBegin * 1000),
        dateEnd: new Date(row.dateEnd * 1000),
        importedAt: new Date(row.importedAt * 1000),
        totalRecords: recordCount,
        totalEmails,
        passRate,
        healthScore,
      });
    }

    return summaries;
  } catch (error) {
    console.error('Failed to get report summaries:', error);
    throw new Error(
      `Failed to get report summaries: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets unique domains from all reports
 */
async function getDomains(): Promise<string[]> {
  const db = getDatabase();

  try {
    const results = db.selectDistinct({ domain: reports.domain }).from(reports).all();

    return results.map((r) => r.domain);
  } catch (error) {
    console.error('Failed to get domains:', error);
    throw new Error(
      `Failed to get domains: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Gets statistics across all reports
 */
async function getGlobalStats(): Promise<{
  totalReports: number;
  totalDomains: number;
  totalEmails: number;
  oldestReport: Date | null;
  newestReport: Date | null;
}> {
  const db = getDatabase();

  try {
    const allReports = db.select().from(reports).all();
    const allRecords = db.select().from(records).all();

    const domains = new Set(allReports.map((r) => r.domain));
    const totalEmails = allRecords.reduce((sum, r) => sum + r.count, 0);

    const dates = allReports.map((r) => r.dateEnd);
    const oldestReport = dates.length > 0 ? new Date(Math.min(...dates) * 1000) : null;
    const newestReport = dates.length > 0 ? new Date(Math.max(...dates) * 1000) : null;

    return {
      totalReports: allReports.length,
      totalDomains: domains.size,
      totalEmails,
      oldestReport,
      newestReport,
    };
  } catch (error) {
    console.error('Failed to get global stats:', error);
    throw new Error(
      `Failed to get global stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

/**
 * Registers all database IPC handlers
 */
export function registerDatabaseHandlers(): void {
  // Get reports with optional filters
  ipcMain.handle('db:get-reports', async (_event, filters?: ReportFilters) => {
    return await getReports(filters);
  });

  // Get single report by ID
  ipcMain.handle('db:get-report', async (_event, reportId: string) => {
    return await getReportById(reportId);
  });

  // Delete report
  ipcMain.handle('db:delete-report', async (_event, reportId: string) => {
    return await deleteReport(reportId);
  });

  // Get report summaries
  ipcMain.handle('db:get-report-summaries', async (_event, limit?: number) => {
    return await getReportSummaries(limit);
  });

  // Get domains
  ipcMain.handle('db:get-domains', async () => {
    return await getDomains();
  });

  // Get global statistics
  ipcMain.handle('db:get-global-stats', async () => {
    return await getGlobalStats();
  });
}
