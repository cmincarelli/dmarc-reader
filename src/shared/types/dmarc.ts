/**
 * Core DMARC Domain Types
 *
 * This file contains all type definitions for DMARC reports (RUA and RUF),
 * following functional programming principles with immutable data structures.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type AuthResult = 'pass' | 'fail' | 'neutral' | 'none' | 'temperror' | 'permerror';
export type Disposition = 'none' | 'quarantine' | 'reject';
export type ReportType = 'rua' | 'ruf';
export type Alignment = 'r' | 's'; // relaxed or strict
export type Scope = 'helo' | 'mfrom';

// ============================================================================
// RUA (Aggregate Report) Types
// ============================================================================

export interface ReportMetadata {
  readonly orgName: string;
  readonly email: string;
  readonly reportId: string;
  readonly dateRange: {
    readonly begin: Date;
    readonly end: Date;
  };
  readonly errors?: readonly string[];
}

export interface PolicyPublished {
  readonly domain: string;
  readonly adkim: Alignment; // DKIM alignment mode
  readonly aspf: Alignment; // SPF alignment mode
  readonly p: Disposition; // Policy for organizational domain
  readonly sp?: Disposition; // Policy for subdomains (optional)
  readonly pct: number; // Percentage of messages to which policy applies
  readonly fo?: string; // Failure reporting options
}

export interface PolicyEvaluated {
  readonly disposition: Disposition;
  readonly dkim: AuthResult;
  readonly spf: AuthResult;
  readonly reason?: readonly PolicyOverrideReason[];
}

export interface PolicyOverrideReason {
  readonly type: string;
  readonly comment?: string;
}

export interface DkimAuthResult {
  readonly domain: string;
  readonly result: AuthResult;
  readonly selector?: string;
  readonly humanResult?: string;
}

export interface SpfAuthResult {
  readonly domain: string;
  readonly result: AuthResult;
  readonly scope?: Scope;
}

export interface Identifiers {
  readonly headerFrom: string;
  readonly envelopeFrom?: string;
  readonly envelopeTo?: string;
}

export interface AuthResults {
  readonly dkim: readonly DkimAuthResult[];
  readonly spf: readonly SpfAuthResult[];
}

export interface Row {
  readonly sourceIp: string;
  readonly count: number;
  readonly policyEvaluated: PolicyEvaluated;
}

export interface RuaRecord {
  readonly row: Row;
  readonly identifiers: Identifiers;
  readonly authResults: AuthResults;
}

export interface RuaReport {
  readonly reportMetadata: ReportMetadata;
  readonly policyPublished: PolicyPublished;
  readonly records: readonly RuaRecord[];
}

// ============================================================================
// RUF (Forensic Report) Types
// ============================================================================

export interface RufReportMetadata {
  readonly orgName: string;
  readonly email: string;
  readonly reportId: string;
  readonly dateRange: {
    readonly begin: Date;
    readonly end: Date;
  };
}

export interface RufPolicyPublished {
  readonly domain: string;
  readonly adkim: Alignment;
  readonly aspf: Alignment;
  readonly p: Disposition;
  readonly sp?: Disposition; // Optional
  readonly pct: number;
  readonly fo?: string; // Optional - failure reporting options
}

export interface RufRow {
  readonly sourceIp: string;
  readonly policyEvaluated: PolicyEvaluated;
}

export interface RufRecord {
  readonly row: RufRow;
  readonly identifiers: Identifiers;
  readonly authResults: AuthResults;
  readonly sample?: {
    readonly headers: string;
    readonly body?: string;
  };
}

export interface RufReport {
  readonly reportMetadata: RufReportMetadata;
  readonly policyPublished: RufPolicyPublished;
  readonly record: RufRecord;
}

// ============================================================================
// Generic Report Type
// ============================================================================

export type DmarcReport = RuaReport | RufReport;

// Type guards
export const isRuaReport = (report: DmarcReport): report is RuaReport => {
  return 'records' in report && Array.isArray(report.records);
};

export const isRufReport = (report: DmarcReport): report is RufReport => {
  return 'record' in report && !Array.isArray((report as RufReport).record);
};

// ============================================================================
// Helper Types
// ============================================================================

export interface ParsedReport {
  readonly id: string;
  readonly type: ReportType;
  readonly report: DmarcReport;
  readonly rawXml: string;
  readonly filename: string;
  readonly importedAt: Date;
  readonly fileSize: number;
}

export interface ParseResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ParseError;
}

export interface ParseError {
  readonly message: string;
  readonly code: string;
  readonly details?: unknown;
}

// ============================================================================
// Functional Programming Helpers
// ============================================================================

/**
 * Either type for error handling in functional style
 */
export type Either<L, R> = Left<L> | Right<R>;

export interface Left<L> {
  readonly _tag: 'Left';
  readonly left: L;
}

export interface Right<R> {
  readonly _tag: 'Right';
  readonly right: R;
}

export const left = <L>(value: L): Left<L> => ({
  _tag: 'Left',
  left: value,
});

export const right = <R>(value: R): Right<R> => ({
  _tag: 'Right',
  right: value,
});

export const isLeft = <L, R>(either: Either<L, R>): either is Left<L> => {
  return either._tag === 'Left';
};

export const isRight = <L, R>(either: Either<L, R>): either is Right<R> => {
  return either._tag === 'Right';
};
