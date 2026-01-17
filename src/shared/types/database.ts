/**
 * Database Schema Types
 *
 * Type definitions for the SQLite database schema using Drizzle ORM.
 */

import type { ReportType } from './dmarc.js';
import type { IssueType, IssueSeverity } from './analysis.js';

// ============================================================================
// Database Table Types
// ============================================================================

export interface ReportRow {
  readonly id: string;
  readonly filename: string;
  readonly type: ReportType;
  readonly orgName: string;
  readonly reportId: string;
  readonly dateBegin: number; // Unix timestamp
  readonly dateEnd: number; // Unix timestamp
  readonly domain: string;
  readonly rawXml: string; // Compressed with lz-string
  readonly parsedData: string; // JSON string
  readonly importedAt: number; // Unix timestamp
  readonly fileSize: number;
}

export interface RecordRow {
  readonly id: string;
  readonly reportId: string;
  readonly sourceIp: string;
  readonly count: number;
  readonly disposition: string;
  readonly dkimResult: string;
  readonly spfResult: string;
  readonly headerFrom: string;
  readonly envelopeFrom: string | null;
  readonly countryCode: string | null;
  readonly asn: number | null;
  readonly organization: string | null;
}

export interface DomainRow {
  readonly id: string;
  readonly domain: string;
  readonly spfRecord: string | null;
  readonly dkimSelectors: string; // JSON array
  readonly dmarcPolicy: string | null;
  readonly addedAt: number; // Unix timestamp
  readonly lastCheck: number | null; // Unix timestamp
}

export interface IssueRow {
  readonly id: string;
  readonly reportId: string;
  readonly type: IssueType;
  readonly severity: IssueSeverity;
  readonly title: string;
  readonly description: string;
  readonly affectedRecords: number;
  readonly recommendation: string; // JSON string
  readonly detectedAt: number; // Unix timestamp
  readonly resolved: boolean;
}

// ============================================================================
// Insert Types (for creating new records)
// ============================================================================

export type NewReport = Omit<ReportRow, 'id' | 'importedAt'>;
export type NewRecord = Omit<RecordRow, 'id'>;
export type NewDomain = Omit<DomainRow, 'id' | 'addedAt' | 'lastCheck'>;
export type NewIssue = Omit<IssueRow, 'id' | 'detectedAt'>;

// ============================================================================
// Query Result Types
// ============================================================================

export interface ReportWithRecords extends ReportRow {
  readonly records: readonly RecordRow[];
}

export interface ReportSummary {
  readonly id: string;
  readonly filename: string;
  readonly type: ReportType;
  readonly orgName: string;
  readonly domain: string;
  readonly dateBegin: number;
  readonly dateEnd: number;
  readonly importedAt: number;
  readonly recordCount: number;
  readonly totalEmails: number;
}

export interface DomainStats {
  readonly domain: string;
  readonly reportCount: number;
  readonly totalEmails: number;
  readonly lastReportDate: number;
  readonly passRate: number;
}
