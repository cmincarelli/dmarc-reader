/**
 * Aggregation Analysis Service
 *
 * Pure functions for aggregating and analyzing DMARC report data.
 * All functions are testable and side-effect free.
 */

import type { RuaReport, RuaRecord } from '../../../shared/types/index.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PassRateStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface AuthResultStats {
  dkim: PassRateStats;
  spf: PassRateStats;
  overall: PassRateStats;
}

export interface SourceStats {
  sourceIp: string;
  count: number;
  emailCount: number;
  passRate: number;
  dkimPass: number;
  spfPass: number;
  disposition: string;
}

export interface DomainStats {
  domain: string;
  reportCount: number;
  totalEmails: number;
  passRate: number;
  lastReportDate: Date;
}

export interface TimeSeriesDataPoint {
  date: Date;
  totalEmails: number;
  passedEmails: number;
  failedEmails: number;
  passRate: number;
}

// ============================================================================
// Authentication Analysis
// ============================================================================

/**
 * Calculates overall authentication pass rate statistics
 */
export function calculateAuthStats(records: readonly RuaRecord[]): AuthResultStats {
  if (records.length === 0) {
    return {
      dkim: { total: 0, passed: 0, failed: 0, passRate: 0 },
      spf: { total: 0, passed: 0, failed: 0, passRate: 0 },
      overall: { total: 0, passed: 0, failed: 0, passRate: 0 },
    };
  }

  let dkimPassed = 0;
  let spfPassed = 0;
  let bothPassed = 0;
  let totalEmails = 0;

  for (const record of records) {
    const count = record.row.count;
    totalEmails += count;

    const dkimPass = record.row.policyEvaluated.dkim === 'pass';
    const spfPass = record.row.policyEvaluated.spf === 'pass';

    if (dkimPass) dkimPassed += count;
    if (spfPass) spfPassed += count;
    if (dkimPass && spfPass) bothPassed += count;
  }

  return {
    dkim: {
      total: totalEmails,
      passed: dkimPassed,
      failed: totalEmails - dkimPassed,
      passRate: totalEmails > 0 ? (dkimPassed / totalEmails) * 100 : 0,
    },
    spf: {
      total: totalEmails,
      passed: spfPassed,
      failed: totalEmails - spfPassed,
      passRate: totalEmails > 0 ? (spfPassed / totalEmails) * 100 : 0,
    },
    overall: {
      total: totalEmails,
      passed: bothPassed,
      failed: totalEmails - bothPassed,
      passRate: totalEmails > 0 ? (bothPassed / totalEmails) * 100 : 0,
    },
  };
}

/**
 * Groups records by authentication result (pass/fail)
 */
export function groupByAuthResult(records: readonly RuaRecord[]): {
  passed: RuaRecord[];
  failed: RuaRecord[];
  partial: RuaRecord[];
} {
  const passed: RuaRecord[] = [];
  const failed: RuaRecord[] = [];
  const partial: RuaRecord[] = [];

  for (const record of records) {
    const dkimPass = record.row.policyEvaluated.dkim === 'pass';
    const spfPass = record.row.policyEvaluated.spf === 'pass';

    if (dkimPass && spfPass) {
      passed.push(record);
    } else if (!dkimPass && !spfPass) {
      failed.push(record);
    } else {
      partial.push(record);
    }
  }

  return { passed, failed, partial };
}

// ============================================================================
// Source IP Analysis
// ============================================================================

/**
 * Aggregates statistics by source IP address
 */
export function aggregateBySourceIp(records: readonly RuaRecord[]): SourceStats[] {
  const sourceMap = new Map<
    string,
    {
      count: number;
      emailCount: number;
      dkimPass: number;
      spfPass: number;
      bothPass: number;
      disposition: string;
    }
  >();

  for (const record of records) {
    const ip = record.row.sourceIp;
    const existing = sourceMap.get(ip);
    const count = record.row.count;

    const dkimPass = record.row.policyEvaluated.dkim === 'pass';
    const spfPass = record.row.policyEvaluated.spf === 'pass';
    const bothPass = dkimPass && spfPass;

    if (existing) {
      existing.count += 1;
      existing.emailCount += count;
      if (dkimPass) existing.dkimPass += count;
      if (spfPass) existing.spfPass += count;
      if (bothPass) existing.bothPass += count;
    } else {
      sourceMap.set(ip, {
        count: 1,
        emailCount: count,
        dkimPass: dkimPass ? count : 0,
        spfPass: spfPass ? count : 0,
        bothPass: bothPass ? count : 0,
        disposition: record.row.policyEvaluated.disposition,
      });
    }
  }

  return Array.from(sourceMap.entries()).map(([sourceIp, stats]) => ({
    sourceIp,
    count: stats.count,
    emailCount: stats.emailCount,
    passRate: stats.emailCount > 0 ? (stats.bothPass / stats.emailCount) * 100 : 0,
    dkimPass: stats.emailCount > 0 ? (stats.dkimPass / stats.emailCount) * 100 : 0,
    spfPass: stats.emailCount > 0 ? (stats.spfPass / stats.emailCount) * 100 : 0,
    disposition: stats.disposition,
  }));
}

/**
 * Gets top N source IPs by email volume
 */
export function getTopSources(records: readonly RuaRecord[], limit: number = 10): SourceStats[] {
  const sources = aggregateBySourceIp(records);
  return sources.sort((a, b) => b.emailCount - a.emailCount).slice(0, limit);
}

/**
 * Gets source IPs with failures
 */
export function getFailedSources(records: readonly RuaRecord[]): SourceStats[] {
  const sources = aggregateBySourceIp(records);
  return sources.filter((source) => source.passRate < 100);
}

// ============================================================================
// Domain Analysis
// ============================================================================

/**
 * Aggregates statistics across multiple reports by domain
 */
export function aggregateByDomain(reports: readonly RuaReport[]): DomainStats[] {
  const domainMap = new Map<
    string,
    {
      reportCount: number;
      totalEmails: number;
      passedEmails: number;
      lastReportDate: Date;
    }
  >();

  for (const report of reports) {
    const domain = report.policyPublished.domain;
    const existing = domainMap.get(domain);

    let totalEmails = 0;
    let passedEmails = 0;

    for (const record of report.records) {
      const count = record.row.count;
      totalEmails += count;

      const dkimPass = record.row.policyEvaluated.dkim === 'pass';
      const spfPass = record.row.policyEvaluated.spf === 'pass';

      if (dkimPass && spfPass) {
        passedEmails += count;
      }
    }

    const reportDate = report.reportMetadata.dateRange.end;

    if (existing) {
      existing.reportCount += 1;
      existing.totalEmails += totalEmails;
      existing.passedEmails += passedEmails;
      if (reportDate > existing.lastReportDate) {
        existing.lastReportDate = reportDate;
      }
    } else {
      domainMap.set(domain, {
        reportCount: 1,
        totalEmails,
        passedEmails,
        lastReportDate: reportDate,
      });
    }
  }

  return Array.from(domainMap.entries()).map(([domain, stats]) => ({
    domain,
    reportCount: stats.reportCount,
    totalEmails: stats.totalEmails,
    passRate: stats.totalEmails > 0 ? (stats.passedEmails / stats.totalEmails) * 100 : 0,
    lastReportDate: stats.lastReportDate,
  }));
}

// ============================================================================
// Time Series Analysis
// ============================================================================

/**
 * Creates time series data from multiple reports
 */
export function createTimeSeries(reports: readonly RuaReport[]): TimeSeriesDataPoint[] {
  const dateMap = new Map<
    string,
    {
      totalEmails: number;
      passedEmails: number;
    }
  >();

  for (const report of reports) {
    // Use the end date of the report period
    const dateKey = report.reportMetadata.dateRange.end.toISOString().split('T')[0];
    const existing = dateMap.get(dateKey);

    let totalEmails = 0;
    let passedEmails = 0;

    for (const record of report.records) {
      const count = record.row.count;
      totalEmails += count;

      const dkimPass = record.row.policyEvaluated.dkim === 'pass';
      const spfPass = record.row.policyEvaluated.spf === 'pass';

      if (dkimPass && spfPass) {
        passedEmails += count;
      }
    }

    if (existing) {
      existing.totalEmails += totalEmails;
      existing.passedEmails += passedEmails;
    } else {
      dateMap.set(dateKey, { totalEmails, passedEmails });
    }
  }

  return Array.from(dateMap.entries())
    .map(([dateKey, stats]) => ({
      date: new Date(dateKey),
      totalEmails: stats.totalEmails,
      passedEmails: stats.passedEmails,
      failedEmails: stats.totalEmails - stats.passedEmails,
      passRate: stats.totalEmails > 0 ? (stats.passedEmails / stats.totalEmails) * 100 : 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ============================================================================
// Disposition Analysis
// ============================================================================

/**
 * Aggregates by policy disposition
 */
export function aggregateByDisposition(records: readonly RuaRecord[]): {
  none: number;
  quarantine: number;
  reject: number;
} {
  let none = 0;
  let quarantine = 0;
  let reject = 0;

  for (const record of records) {
    const count = record.row.count;
    const disposition = record.row.policyEvaluated.disposition;

    switch (disposition) {
      case 'none':
        none += count;
        break;
      case 'quarantine':
        quarantine += count;
        break;
      case 'reject':
        reject += count;
        break;
    }
  }

  return { none, quarantine, reject };
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Generates a comprehensive summary of a report
 */
export function generateReportSummary(report: RuaReport) {
  const authStats = calculateAuthStats(report.records);
  const topSources = getTopSources(report.records, 5);
  const dispositionStats = aggregateByDisposition(report.records);
  const { passed, failed, partial } = groupByAuthResult(report.records);

  const totalEmails = report.records.reduce((sum, r) => sum + r.row.count, 0);

  return {
    metadata: {
      orgName: report.reportMetadata.orgName,
      reportId: report.reportMetadata.reportId,
      domain: report.policyPublished.domain,
      dateRange: report.reportMetadata.dateRange,
      policy: report.policyPublished.p,
    },
    statistics: {
      totalRecords: report.records.length,
      totalEmails,
      authStats,
      dispositionStats,
      passedRecords: passed.length,
      failedRecords: failed.length,
      partialRecords: partial.length,
    },
    topSources,
  };
}
