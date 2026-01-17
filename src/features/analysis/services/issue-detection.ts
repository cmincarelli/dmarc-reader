/**
 * Issue Detection Service
 *
 * Pure functions for detecting issues and anomalies in DMARC reports.
 * Identifies authentication failures, alignment issues, and suspicious activity.
 */

import type { RuaReport, RuaRecord } from '../../../shared/types/index.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IssueType =
  | 'spf_failure'
  | 'dkim_failure'
  | 'alignment_failure'
  | 'high_volume_failure'
  | 'suspicious_source'
  | 'policy_override'
  | 'partial_auth'
  | 'configuration_issue';

export interface DetectedIssue {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedRecords: number;
  affectedEmails: number;
  details: Record<string, unknown>;
}

// ============================================================================
// SPF Issues
// ============================================================================

/**
 * Detects SPF authentication failures
 */
export function detectSpfFailures(records: readonly RuaRecord[]): DetectedIssue | null {
  console.log('[SPF-CHECK] Checking', records.length, 'records for SPF failures');

  const failures = records.filter((r) => r.row.policyEvaluated.spf === 'fail');
  console.log('[SPF-CHECK] Found', failures.length, 'records with SPF failures');

  if (failures.length === 0) {
    return null;
  }

  const affectedEmails = failures.reduce((sum, r) => sum + r.row.count, 0);
  const totalEmails = records.reduce((sum, r) => sum + r.row.count, 0);
  const failureRate = (affectedEmails / totalEmails) * 100;

  console.log(`[SPF-CHECK] ${affectedEmails} of ${totalEmails} emails failed (${failureRate.toFixed(1)}%)`);

  // Get unique source IPs
  const sourceIps = [...new Set(failures.map((r) => r.row.sourceIp))];

  return {
    type: 'spf_failure',
    severity: failureRate > 50 ? 'critical' : failureRate > 20 ? 'high' : 'medium',
    title: 'SPF Authentication Failures',
    description: `${affectedEmails} emails (${failureRate.toFixed(1)}%) failed SPF authentication from ${sourceIps.length} source IP(s).`,
    affectedRecords: failures.length,
    affectedEmails,
    details: {
      failureRate,
      sourceIps: sourceIps.slice(0, 10), // Top 10
      totalSources: sourceIps.length,
    },
  };
}

/**
 * Detects DKIM authentication failures
 */
export function detectDkimFailures(records: readonly RuaRecord[]): DetectedIssue | null {
  console.log('[DKIM-CHECK] Checking', records.length, 'records for DKIM failures');

  const failures = records.filter((r) => r.row.policyEvaluated.dkim === 'fail');
  console.log('[DKIM-CHECK] Found', failures.length, 'records with DKIM failures');

  if (failures.length === 0) {
    return null;
  }

  const affectedEmails = failures.reduce((sum, r) => sum + r.row.count, 0);
  const totalEmails = records.reduce((sum, r) => sum + r.row.count, 0);
  const failureRate = (affectedEmails / totalEmails) * 100;

  console.log(`[DKIM-CHECK] ${affectedEmails} of ${totalEmails} emails failed (${failureRate.toFixed(1)}%)`);

  // Get unique domains that failed
  const domains = [...new Set(failures.flatMap((r) => r.authResults.dkim.map((d) => d.domain)))];

  return {
    type: 'dkim_failure',
    severity: failureRate > 50 ? 'critical' : failureRate > 20 ? 'high' : 'medium',
    title: 'DKIM Authentication Failures',
    description: `${affectedEmails} emails (${failureRate.toFixed(1)}%) failed DKIM authentication across ${domains.length} domain(s).`,
    affectedRecords: failures.length,
    affectedEmails,
    details: {
      failureRate,
      domains: domains.slice(0, 10),
      totalDomains: domains.length,
    },
  };
}

// ============================================================================
// Alignment Issues
// ============================================================================

/**
 * Detects domain alignment failures
 */
export function detectAlignmentIssues(records: readonly RuaRecord[]): DetectedIssue | null {
  const alignmentIssues = records.filter((r) => {
    const headerFrom = r.identifiers.headerFrom;
    const envelopeFrom = r.identifiers.envelopeFrom;

    // Check if envelope domain differs from header domain
    return envelopeFrom && !envelopeFrom.endsWith(headerFrom) && !headerFrom.endsWith(envelopeFrom);
  });

  if (alignmentIssues.length === 0) {
    return null;
  }

  const affectedEmails = alignmentIssues.reduce((sum, r) => sum + r.row.count, 0);
  const totalEmails = records.reduce((sum, r) => sum + r.row.count, 0);
  const issueRate = (affectedEmails / totalEmails) * 100;

  // Get unique envelope domains
  const envelopeDomains = [
    ...new Set(
      alignmentIssues
        .map((r) => r.identifiers.envelopeFrom)
        .filter((d): d is string => d !== undefined)
    ),
  ];

  return {
    type: 'alignment_failure',
    severity: issueRate > 30 ? 'high' : issueRate > 10 ? 'medium' : 'low',
    title: 'Domain Alignment Issues',
    description: `${affectedEmails} emails (${issueRate.toFixed(1)}%) have misaligned header and envelope domains.`,
    affectedRecords: alignmentIssues.length,
    affectedEmails,
    details: {
      issueRate,
      envelopeDomains: envelopeDomains.slice(0, 10),
      totalEnvelopeDomains: envelopeDomains.length,
    },
  };
}

// ============================================================================
// Volume Anomalies
// ============================================================================

/**
 * Detects high-volume failures from single sources
 */
export function detectHighVolumeFailures(records: readonly RuaRecord[]): DetectedIssue | null {
  const failedRecords = records.filter(
    (r) => r.row.policyEvaluated.dkim === 'fail' || r.row.policyEvaluated.spf === 'fail'
  );

  // Group by source IP
  const sourceMap = new Map<string, number>();
  for (const record of failedRecords) {
    const ip = record.row.sourceIp;
    const count = sourceMap.get(ip) || 0;
    sourceMap.set(ip, count + record.row.count);
  }

  // Find sources with >100 failed emails
  const highVolumeSources = Array.from(sourceMap.entries())
    .filter(([_, count]) => count > 100)
    .sort((a, b) => b[1] - a[1]);

  if (highVolumeSources.length === 0) {
    return null;
  }

  const totalFailedEmails = highVolumeSources.reduce((sum, [_, count]) => sum + count, 0);

  return {
    type: 'high_volume_failure',
    severity: highVolumeSources[0][1] > 1000 ? 'critical' : 'high',
    title: 'High Volume Authentication Failures',
    description: `${highVolumeSources.length} source IP(s) generated ${totalFailedEmails} failed authentication attempts.`,
    affectedRecords: failedRecords.length,
    affectedEmails: totalFailedEmails,
    details: {
      sources: highVolumeSources.slice(0, 5).map(([ip, count]) => ({ ip, count })),
      totalSources: highVolumeSources.length,
    },
  };
}

// ============================================================================
// Suspicious Activity
// ============================================================================

/**
 * Detects potentially suspicious sources
 */
export function detectSuspiciousSources(records: readonly RuaRecord[]): DetectedIssue | null {
  // Sources that have 100% failure rate and sent emails
  const suspiciousSources = records.filter((r) => {
    const dkimFail = r.row.policyEvaluated.dkim === 'fail';
    const spfFail = r.row.policyEvaluated.spf === 'fail';
    return dkimFail && spfFail;
  });

  if (suspiciousSources.length === 0) {
    return null;
  }

  const affectedEmails = suspiciousSources.reduce((sum, r) => sum + r.row.count, 0);
  const sourceIps = [...new Set(suspiciousSources.map((r) => r.row.sourceIp))];

  // Check if any were quarantined or rejected
  const actionedEmails = suspiciousSources
    .filter((r) => r.row.policyEvaluated.disposition !== 'none')
    .reduce((sum, r) => sum + r.row.count, 0);

  return {
    type: 'suspicious_source',
    severity: actionedEmails === 0 ? 'critical' : 'high',
    title: 'Suspicious Email Sources Detected',
    description: `${sourceIps.length} source IP(s) sent ${affectedEmails} emails that failed both SPF and DKIM. ${actionedEmails} were quarantined/rejected.`,
    affectedRecords: suspiciousSources.length,
    affectedEmails,
    details: {
      sourceIps: sourceIps.slice(0, 10),
      totalSources: sourceIps.length,
      actionedEmails,
      nonActionedEmails: affectedEmails - actionedEmails,
    },
  };
}

// ============================================================================
// Policy Issues
// ============================================================================

/**
 * Detects policy override issues
 */
export function detectPolicyOverrides(records: readonly RuaRecord[]): DetectedIssue | null {
  const overrides = records.filter((r) => {
    return r.row.policyEvaluated.reason && r.row.policyEvaluated.reason.length > 0;
  });

  if (overrides.length === 0) {
    return null;
  }

  const affectedEmails = overrides.reduce((sum, r) => sum + r.row.count, 0);

  // Get unique override reasons
  const reasons = [
    ...new Set(
      overrides.flatMap((r) => r.row.policyEvaluated.reason?.map((reason) => reason.type) || [])
    ),
  ];

  return {
    type: 'policy_override',
    severity: 'medium',
    title: 'Policy Overrides Detected',
    description: `${affectedEmails} emails had policy overrides with ${reasons.length} different reason(s).`,
    affectedRecords: overrides.length,
    affectedEmails,
    details: {
      reasons,
      mostCommonReason: reasons[0],
    },
  };
}

/**
 * Detects partial authentication (one of SPF/DKIM passes, but not both)
 */
export function detectPartialAuth(records: readonly RuaRecord[]): DetectedIssue | null {
  const partialAuth = records.filter((r) => {
    const dkimPass = r.row.policyEvaluated.dkim === 'pass';
    const spfPass = r.row.policyEvaluated.spf === 'pass';
    return (dkimPass && !spfPass) || (!dkimPass && spfPass);
  });

  if (partialAuth.length === 0) {
    return null;
  }

  const affectedEmails = partialAuth.reduce((sum, r) => sum + r.row.count, 0);
  const totalEmails = records.reduce((sum, r) => sum + r.row.count, 0);
  const partialRate = (affectedEmails / totalEmails) * 100;

  const dkimOnlyPass = partialAuth.filter((r) => r.row.policyEvaluated.dkim === 'pass').length;
  const spfOnlyPass = partialAuth.filter((r) => r.row.policyEvaluated.spf === 'pass').length;

  return {
    type: 'partial_auth',
    severity: partialRate > 20 ? 'medium' : 'low',
    title: 'Partial Authentication',
    description: `${affectedEmails} emails (${partialRate.toFixed(1)}%) passed only one authentication method.`,
    affectedRecords: partialAuth.length,
    affectedEmails,
    details: {
      partialRate,
      dkimOnlyPass,
      spfOnlyPass,
    },
  };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Runs all issue detection checks on a report
 */
export function detectAllIssues(report: RuaReport): DetectedIssue[] {
  console.log('[ISSUE-DETECTION] Starting detection for report with', report.records?.length || 0, 'records');

  if (!report.records || report.records.length === 0) {
    console.warn('[ISSUE-DETECTION] No records found in report');
    return [];
  }

  const issues: DetectedIssue[] = [];

  // Run all detection functions
  const detectors = [
    { name: 'SPF Failures', fn: detectSpfFailures },
    { name: 'DKIM Failures', fn: detectDkimFailures },
    { name: 'Alignment Issues', fn: detectAlignmentIssues },
    { name: 'High Volume Failures', fn: detectHighVolumeFailures },
    { name: 'Suspicious Sources', fn: detectSuspiciousSources },
    { name: 'Policy Overrides', fn: detectPolicyOverrides },
    { name: 'Partial Auth', fn: detectPartialAuth },
  ];

  for (const detector of detectors) {
    const issue = detector.fn(report.records);
    if (issue) {
      console.log(`[ISSUE-DETECTION] ${detector.name}: Found ${issue.severity} issue - ${issue.title}`);
      issues.push(issue);
    } else {
      console.log(`[ISSUE-DETECTION] ${detector.name}: No issues found`);
    }
  }

  console.log(`[ISSUE-DETECTION] Total issues found: ${issues.length}`);

  // Sort by severity (critical > high > medium > low)
  const severityOrder: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
  return issues.sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );
}

/**
 * Gets a severity score (for prioritization)
 */
export function getSeverityScore(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Calculates an overall health score (0-100)
 */
export function calculateHealthScore(report: RuaReport): number {
  const issues = detectAllIssues(report);

  if (issues.length === 0) {
    return 100;
  }

  // Calculate weighted penalty based on severity
  const penalty = issues.reduce((sum, issue) => {
    const weight = getSeverityScore(issue.severity);
    return sum + weight * 5; // Each severity point = 5% penalty
  }, 0);

  return Math.max(0, 100 - penalty);
}
