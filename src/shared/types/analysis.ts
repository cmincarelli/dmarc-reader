/**
 * Analysis Result Types
 *
 * Types for data analysis, aggregations, trends, issues, and recommendations.
 */

import type { AuthResult, Disposition } from './dmarc.js';

// ============================================================================
// Analysis Summary Types
// ============================================================================

export interface PassRateMetrics {
  readonly overall: number; // Percentage of fully passing records
  readonly spf: number; // SPF pass rate
  readonly dkim: number; // DKIM pass rate
  readonly dmarc: number; // DMARC alignment pass rate
}

export interface DispositionBreakdown {
  readonly none: number;
  readonly quarantine: number;
  readonly reject: number;
}

export interface SourceInfo {
  readonly ip: string;
  readonly domain?: string;
  readonly count: number;
  readonly country?: string;
  readonly countryCode?: string;
  readonly organization?: string;
  readonly asn?: number;
}

export interface AnalysisSummary {
  readonly totalRecords: number;
  readonly totalEmails: number; // Sum of all counts
  readonly uniqueSources: number;
  readonly passRate: PassRateMetrics;
  readonly dispositions: DispositionBreakdown;
  readonly topSources: readonly SourceInfo[];
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
}

// ============================================================================
// Trend Analysis Types
// ============================================================================

export interface DailyMetrics {
  readonly date: Date;
  readonly totalEmails: number;
  readonly passRate: number;
  readonly failureRate: number;
  readonly spfPass: number;
  readonly spfFail: number;
  readonly dkimPass: number;
  readonly dkimFail: number;
}

export interface WeeklyMetrics {
  readonly week: string;
  readonly totalEmails: number;
  readonly passRate: number;
}

export interface TrendData {
  readonly daily: readonly DailyMetrics[];
  readonly weekly: readonly WeeklyMetrics[];
}

// ============================================================================
// Issue Detection Types
// ============================================================================

export type IssueType =
  | 'spf_failure'
  | 'dkim_failure'
  | 'alignment_failure'
  | 'policy_violation'
  | 'suspicious_source'
  | 'forwarder_detected'
  | 'spoofing_attempt';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Issue {
  readonly id: string;
  readonly type: IssueType;
  readonly severity: IssueSeverity;
  readonly title: string;
  readonly description: string;
  readonly affectedRecords: number;
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly recommendation: Recommendation;
  readonly resolved: boolean;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export type DnsRecordType = 'SPF' | 'DKIM' | 'DMARC';

export interface DnsRecord {
  readonly type: DnsRecordType;
  readonly record: string;
  readonly explanation?: string;
}

export interface Recommendation {
  readonly priority: number;
  readonly action: string;
  readonly details: string;
  readonly dnsRecords?: readonly DnsRecord[];
  readonly estimatedImpact: string;
  readonly category: 'authentication' | 'policy' | 'security' | 'configuration';
}

// ============================================================================
// Geolocation Types
// ============================================================================

export interface GeoLocationData {
  readonly ip: string;
  readonly country: string;
  readonly countryCode: string;
  readonly region?: string;
  readonly city?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly asn?: number;
  readonly organization?: string;
  readonly isProxy?: boolean;
  readonly threatScore?: number;
}

// ============================================================================
// Source Analysis Types
// ============================================================================

export interface SourceAnalysis {
  readonly ip: string;
  readonly totalEmails: number;
  readonly authResults: {
    readonly spfPass: number;
    readonly spfFail: number;
    readonly dkimPass: number;
    readonly dkimFail: number;
  };
  readonly dispositions: DispositionBreakdown;
  readonly geo?: GeoLocationData;
  readonly domains: readonly string[];
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Filter Types
// ============================================================================

export interface AnalysisFilters {
  readonly dateRange?: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly disposition?: readonly Disposition[];
  readonly authResult?: {
    readonly spf?: readonly AuthResult[];
    readonly dkim?: readonly AuthResult[];
  };
  readonly country?: readonly string[];
  readonly domain?: readonly string[];
  readonly sourceIp?: readonly string[];
}

// ============================================================================
// Aggregation Types
// ============================================================================

export interface AggregationResult<T> {
  readonly key: string;
  readonly count: number;
  readonly data: T;
}

export interface TimeSeriesPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly metadata?: Record<string, unknown>;
}
