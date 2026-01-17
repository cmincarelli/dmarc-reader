/**
 * Report Storage Service
 *
 * Pure functions for storing and retrieving DMARC reports from the database.
 * Handles both RUA (aggregate) and RUF (forensic) reports.
 */

import { getDatabase } from '../utils/database.js';
import { reports, records } from '../utils/database.js';
import type { RuaReport, RufReport } from '../../src/shared/types/index.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// ============================================================================
// Type Definitions
// ============================================================================

export interface StoreReportOptions {
  filename: string;
  fileSize: number;
  rawXml: string;
}

export interface StoredReport {
  id: string;
  filename: string;
  type: 'rua' | 'ruf';
  orgName: string;
  reportId: string;
  domain: string;
  dateBegin: Date;
  dateEnd: Date;
  importedAt: Date;
}

// ============================================================================
// RUA Report Storage
// ============================================================================

/**
 * Stores a parsed RUA report in the database
 */
export function storeRuaReport(report: RuaReport, options: StoreReportOptions): StoredReport {
  const db = getDatabase();
  const reportDbId = randomUUID();
  const now = Date.now();

  try {
    // Store main report
    db.insert(reports)
      .values({
        id: reportDbId,
        filename: options.filename,
        type: 'rua',
        orgName: report.reportMetadata.orgName,
        reportId: report.reportMetadata.reportId,
        dateBegin: Math.floor(report.reportMetadata.dateRange.begin.getTime() / 1000),
        dateEnd: Math.floor(report.reportMetadata.dateRange.end.getTime() / 1000),
        domain: report.policyPublished.domain,
        rawXml: options.rawXml,
        parsedData: JSON.stringify(report),
        importedAt: Math.floor(now / 1000),
        fileSize: options.fileSize,
      })
      .run();

    // Store all records
    const recordValues = report.records.map((record) => ({
      id: randomUUID(),
      reportId: reportDbId,
      sourceIp: record.row.sourceIp,
      count: record.row.count,
      disposition: record.row.policyEvaluated.disposition,
      dkimResult: record.row.policyEvaluated.dkim,
      spfResult: record.row.policyEvaluated.spf,
      headerFrom: record.identifiers.headerFrom,
      envelopeFrom: record.identifiers.envelopeFrom || null,
      countryCode: null, // Will be enriched later
      asn: null,
      organization: null,
    }));

    if (recordValues.length > 0) {
      db.insert(records).values(recordValues).run();
    }

    return {
      id: reportDbId,
      filename: options.filename,
      type: 'rua',
      orgName: report.reportMetadata.orgName,
      reportId: report.reportMetadata.reportId,
      domain: report.policyPublished.domain,
      dateBegin: report.reportMetadata.dateRange.begin,
      dateEnd: report.reportMetadata.dateRange.end,
      importedAt: new Date(now),
    };
  } catch (error) {
    console.error('Failed to store RUA report:', error);
    throw new Error(
      `Failed to store RUA report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// RUF Report Storage
// ============================================================================

/**
 * Stores a parsed RUF report in the database
 */
export function storeRufReport(report: RufReport, options: StoreReportOptions): StoredReport {
  const db = getDatabase();
  const reportDbId = randomUUID();
  const now = Date.now();

  try {
    // Store main report
    db.insert(reports)
      .values({
        id: reportDbId,
        filename: options.filename,
        type: 'ruf',
        orgName: report.reportMetadata.orgName,
        reportId: report.reportMetadata.reportId,
        dateBegin: Math.floor(report.reportMetadata.dateRange.begin.getTime() / 1000),
        dateEnd: Math.floor(report.reportMetadata.dateRange.end.getTime() / 1000),
        domain: report.policyPublished.domain,
        rawXml: options.rawXml,
        parsedData: JSON.stringify(report),
        importedAt: Math.floor(now / 1000),
        fileSize: options.fileSize,
      })
      .run();

    // Store the single forensic record
    db.insert(records)
      .values({
        id: randomUUID(),
        reportId: reportDbId,
        sourceIp: report.record.row.sourceIp,
        count: 1, // RUF reports are always for a single email
        disposition: report.record.row.policyEvaluated.disposition,
        dkimResult: report.record.row.policyEvaluated.dkim,
        spfResult: report.record.row.policyEvaluated.spf,
        headerFrom: report.record.identifiers.headerFrom,
        envelopeFrom: report.record.identifiers.envelopeFrom || null,
        countryCode: null, // Will be enriched later
        asn: null,
        organization: null,
      })
      .run();

    return {
      id: reportDbId,
      filename: options.filename,
      type: 'ruf',
      orgName: report.reportMetadata.orgName,
      reportId: report.reportMetadata.reportId,
      domain: report.policyPublished.domain,
      dateBegin: report.reportMetadata.dateRange.begin,
      dateEnd: report.reportMetadata.dateRange.end,
      importedAt: new Date(now),
    };
  } catch (error) {
    console.error('Failed to store RUF report:', error);
    throw new Error(
      `Failed to store RUF report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Report Retrieval
// ============================================================================

/**
 * Retrieves all reports from the database
 */
export function getAllReports(): StoredReport[] {
  const db = getDatabase();

  try {
    const results = db.select().from(reports).all();

    return results.map((row) => ({
      id: row.id,
      filename: row.filename,
      type: row.type as 'rua' | 'ruf',
      orgName: row.orgName,
      reportId: row.reportId,
      domain: row.domain,
      dateBegin: new Date(row.dateBegin * 1000),
      dateEnd: new Date(row.dateEnd * 1000),
      importedAt: new Date(row.importedAt * 1000),
    }));
  } catch (error) {
    console.error('Failed to retrieve reports:', error);
    throw new Error(
      `Failed to retrieve reports: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieves a single report by ID
 */
export function getReportById(id: string): StoredReport | null {
  const db = getDatabase();

  try {
    const result = db.select().from(reports).where(eq(reports.id, id)).get();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      filename: result.filename,
      type: result.type as 'rua' | 'ruf',
      orgName: result.orgName,
      reportId: result.reportId,
      domain: result.domain,
      dateBegin: new Date(result.dateBegin * 1000),
      dateEnd: new Date(result.dateEnd * 1000),
      importedAt: new Date(result.importedAt * 1000),
    };
  } catch (error) {
    console.error('Failed to retrieve report:', error);
    throw new Error(
      `Failed to retrieve report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deletes a report and all associated records
 */
export function deleteReport(id: string): boolean {
  const db = getDatabase();

  try {
    const result = db.delete(reports).where(eq(reports.id, id)).run();
    return result.changes > 0;
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw new Error(
      `Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Checks if a report with the given report_id already exists
 */
export function reportExists(reportId: string): boolean {
  const db = getDatabase();

  try {
    const result = db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.reportId, reportId))
      .get();

    return result !== undefined;
  } catch (error) {
    console.error('Failed to check report existence:', error);
    return false;
  }
}

/**
 * Gets the total count of reports in the database
 */
export function getReportCount(): number {
  const db = getDatabase();

  try {
    const result = db.select().from(reports).all();
    return result.length;
  } catch (error) {
    console.error('Failed to get report count:', error);
    return 0;
  }
}
