/**
 * Recommendations Service
 *
 * Pure functions for generating actionable recommendations based on DMARC report analysis.
 * Provides DNS configuration suggestions and policy improvements.
 */

import type { RuaReport } from '../../../shared/types/index.js';
import { detectAllIssues, type DetectedIssue, type IssueType } from './issue-detection.js';
import { calculateAuthStats } from './aggregation.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
  priority: RecommendationPriority;
  category: 'dns' | 'policy' | 'monitoring' | 'security';
  title: string;
  description: string;
  action: string;
  dnsRecords?: string[];
  relatedIssues: IssueType[];
}

// ============================================================================
// SPF Recommendations
// ============================================================================

/**
 * Generates SPF-related recommendations
 */
function generateSpfRecommendations(report: RuaReport, issues: DetectedIssue[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const spfIssue = issues.find((i) => i.type === 'spf_failure');

  if (!spfIssue) {
    return recommendations;
  }

  const authStats = calculateAuthStats(report.records);
  const spfFailureRate = 100 - authStats.spf.passRate;

  // High SPF failure rate
  if (spfFailureRate > 20) {
    const failedSources = report.records
      .filter((r) => r.row.policyEvaluated.spf === 'fail')
      .map((r) => r.row.sourceIp);

    const uniqueSources = [...new Set(failedSources)];

    recommendations.push({
      priority: spfFailureRate > 50 ? 'critical' : 'high',
      category: 'dns',
      title: 'Review and Update SPF Record',
      description: `${spfFailureRate.toFixed(1)}% of emails are failing SPF authentication from ${uniqueSources.length} source IP(s). Your SPF record may be missing authorized mail servers.`,
      action: `1. Identify legitimate mail servers from the failed sources\n2. Add missing IP addresses or domains to your SPF record\n3. Verify SPF record syntax\n4. Ensure SPF record doesn't exceed 10 DNS lookups`,
      dnsRecords: [
        `Example: v=spf1 include:_spf.google.com ip4:${uniqueSources[0]} ~all`,
        `Current policy: ${report.policyPublished.aspf === 's' ? 'Strict' : 'Relaxed'} alignment`,
      ],
      relatedIssues: ['spf_failure'],
    });
  }

  return recommendations;
}

// ============================================================================
// DKIM Recommendations
// ============================================================================

/**
 * Generates DKIM-related recommendations
 */
function generateDkimRecommendations(report: RuaReport, issues: DetectedIssue[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const dkimIssue = issues.find((i) => i.type === 'dkim_failure');

  if (!dkimIssue) {
    return recommendations;
  }

  const authStats = calculateAuthStats(report.records);
  const dkimFailureRate = 100 - authStats.dkim.passRate;

  // High DKIM failure rate
  if (dkimFailureRate > 20) {
    const failedDomains = report.records
      .filter((r) => r.row.policyEvaluated.dkim === 'fail')
      .flatMap((r) => r.authResults.dkim.map((d) => ({ domain: d.domain, selector: d.selector })));

    const uniqueSelectors = [...new Set(failedDomains.map((d) => d.selector).filter(Boolean))];

    recommendations.push({
      priority: dkimFailureRate > 50 ? 'critical' : 'high',
      category: 'dns',
      title: 'Fix DKIM Configuration',
      description: `${dkimFailureRate.toFixed(1)}% of emails are failing DKIM authentication. DKIM signatures may be invalid or DNS records may be missing.`,
      action: `1. Verify DKIM DNS records are published for selectors: ${uniqueSelectors.join(', ')}\n2. Check that DKIM keys match between your mail server and DNS\n3. Ensure DKIM signatures are being added to outgoing emails\n4. Verify selector names are correct`,
      dnsRecords: uniqueSelectors.map(
        (selector) =>
          `${selector}._domainkey.${report.policyPublished.domain} TXT "v=DKIM1; k=rsa; p=<public-key>"`
      ),
      relatedIssues: ['dkim_failure'],
    });
  }

  return recommendations;
}

// ============================================================================
// Alignment Recommendations
// ============================================================================

/**
 * Generates alignment-related recommendations
 */
function generateAlignmentRecommendations(
  report: RuaReport,
  issues: DetectedIssue[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const alignmentIssue = issues.find((i) => i.type === 'alignment_failure');

  if (!alignmentIssue) {
    return recommendations;
  }

  const strictAlignment =
    report.policyPublished.adkim === 's' || report.policyPublished.aspf === 's';

  recommendations.push({
    priority: 'medium',
    category: 'policy',
    title: strictAlignment ? 'Review Strict Alignment Policy' : 'Consider Stricter Alignment',
    description: strictAlignment
      ? 'Strict alignment may be causing legitimate emails to fail. Consider relaxed alignment if issues persist.'
      : 'Domain alignment issues detected. Consider implementing strict alignment for better security.',
    action: strictAlignment
      ? `1. Review envelope domains from failed records\n2. Ensure all legitimate mail servers use aligned domains\n3. Consider switching to relaxed alignment if appropriate\n4. Update DMARC policy: adkim=r or aspf=r`
      : `1. Investigate envelope domain mismatches\n2. Configure mail servers to use aligned domains\n3. Consider implementing strict alignment: adkim=s and aspf=s`,
    dnsRecords: [
      `Current: adkim=${report.policyPublished.adkim}, aspf=${report.policyPublished.aspf}`,
      `Recommended: Evaluate based on your email infrastructure`,
    ],
    relatedIssues: ['alignment_failure'],
  });

  return recommendations;
}

// ============================================================================
// Policy Recommendations
// ============================================================================

/**
 * Generates DMARC policy recommendations
 */
function generatePolicyRecommendations(
  report: RuaReport,
  _issues: DetectedIssue[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const currentPolicy = report.policyPublished.p;
  const authStats = calculateAuthStats(report.records);
  const passRate = authStats.overall.passRate;

  // Recommendation to increase policy strictness
  if (currentPolicy === 'none' && passRate > 95) {
    recommendations.push({
      priority: 'high',
      category: 'policy',
      title: 'Upgrade to Quarantine Policy',
      description: `With a ${passRate.toFixed(1)}% pass rate, you can safely upgrade from 'none' to 'quarantine' policy for better email security.`,
      action: `1. Monitor reports for 2-4 weeks to confirm stability\n2. Update DMARC policy to p=quarantine\n3. Set pct=10 initially, then gradually increase\n4. Monitor for any legitimate email issues`,
      dnsRecords: [
        `_dmarc.${report.policyPublished.domain} TXT "v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc@${report.policyPublished.domain}"`,
      ],
      relatedIssues: [],
    });
  } else if (currentPolicy === 'quarantine' && passRate > 98) {
    recommendations.push({
      priority: 'medium',
      category: 'policy',
      title: 'Consider Reject Policy',
      description: `With an excellent ${passRate.toFixed(1)}% pass rate, you could implement the strictest 'reject' policy for maximum protection.`,
      action: `1. Monitor quarantine reports for several weeks\n2. Ensure no legitimate emails are being quarantined\n3. Gradually increase pct to 100\n4. Update policy to p=reject when confident`,
      dnsRecords: [
        `_dmarc.${report.policyPublished.domain} TXT "v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@${report.policyPublished.domain}"`,
      ],
      relatedIssues: [],
    });
  } else if (passRate < 80) {
    recommendations.push({
      priority: 'critical',
      category: 'policy',
      title: 'Do Not Increase Policy Strictness',
      description: `With only ${passRate.toFixed(1)}% pass rate, focus on fixing authentication issues before considering a stricter policy.`,
      action: `1. Fix SPF and DKIM configuration first\n2. Monitor authentication pass rates\n3. Only upgrade policy once pass rate exceeds 95%\n4. Consider keeping policy at 'none' until issues resolved`,
      relatedIssues: ['spf_failure', 'dkim_failure'],
    });
  }

  // Subdomain policy recommendation
  if (!report.policyPublished.sp && currentPolicy !== 'none') {
    recommendations.push({
      priority: 'low',
      category: 'policy',
      title: 'Add Subdomain Policy',
      description:
        'No subdomain policy (sp) is specified. Consider adding one to protect subdomains.',
      action: `1. Decide if subdomains should have same or different policy\n2. Add sp tag to DMARC record\n3. Common approach: sp=quarantine or sp=reject`,
      dnsRecords: [
        `_dmarc.${report.policyPublished.domain} TXT "v=DMARC1; p=${currentPolicy}; sp=quarantine; ..."`,
      ],
      relatedIssues: [],
    });
  }

  return recommendations;
}

// ============================================================================
// Security Recommendations
// ============================================================================

/**
 * Generates security-related recommendations
 */
function generateSecurityRecommendations(
  _report: RuaReport,
  issues: DetectedIssue[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const suspiciousIssue = issues.find((i) => i.type === 'suspicious_source');
  const highVolumeIssue = issues.find((i) => i.type === 'high_volume_failure');

  if (suspiciousIssue) {
    const details = suspiciousIssue.details as { nonActionedEmails?: number };

    if (details.nonActionedEmails && details.nonActionedEmails > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        title: 'Suspicious Sources Not Blocked',
        description: `${details.nonActionedEmails} emails from suspicious sources were not quarantined or rejected. Immediate action required.`,
        action: `1. Review source IPs in the report\n2. Block malicious IPs at firewall/mail server level\n3. Increase DMARC policy strictness\n4. Consider implementing real-time blocklists (RBL)`,
        relatedIssues: ['suspicious_source'],
      });
    }
  }

  if (highVolumeIssue) {
    recommendations.push({
      priority: 'high',
      category: 'security',
      title: 'Investigate High-Volume Failures',
      description:
        'Large volumes of authentication failures from specific sources detected. Could indicate spoofing or misconfiguration.',
      action: `1. Check if sources are legitimate mail servers\n2. If legitimate, fix authentication configuration\n3. If malicious, block at mail server level\n4. Monitor for continued activity`,
      relatedIssues: ['high_volume_failure'],
    });
  }

  return recommendations;
}

// ============================================================================
// Monitoring Recommendations
// ============================================================================

/**
 * Generates monitoring-related recommendations
 */
function generateMonitoringRecommendations(report: RuaReport): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Check if forensic reporting is enabled
  const hasForensicReporting = report.policyPublished.fo !== undefined;

  if (!hasForensicReporting) {
    recommendations.push({
      priority: 'low',
      category: 'monitoring',
      title: 'Enable Forensic Reporting (RUF)',
      description:
        'Forensic reports provide detailed information about authentication failures, helping diagnose issues faster.',
      action: `1. Add 'ruf' tag to DMARC record\n2. Set up email address for forensic reports\n3. Add 'fo' tag to control when reports are sent\n4. Note: Forensic reports may contain email content`,
      dnsRecords: [
        `_dmarc.${report.policyPublished.domain} TXT "v=DMARC1; p=${report.policyPublished.p}; rua=...; ruf=mailto:forensic@${report.policyPublished.domain}; fo=1"`,
      ],
      relatedIssues: [],
    });
  }

  return recommendations;
}

// ============================================================================
// Main Recommendation Function
// ============================================================================

/**
 * Generates all recommendations for a report
 */
export function generateRecommendations(report: RuaReport): Recommendation[] {
  const issues = detectAllIssues(report);

  const recommendations: Recommendation[] = [
    ...generateSpfRecommendations(report, issues),
    ...generateDkimRecommendations(report, issues),
    ...generateAlignmentRecommendations(report, issues),
    ...generatePolicyRecommendations(report, issues),
    ...generateSecurityRecommendations(report, issues),
    ...generateMonitoringRecommendations(report),
  ];

  // Sort by priority
  const priorityOrder: RecommendationPriority[] = ['critical', 'high', 'medium', 'low'];
  return recommendations.sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );
}

/**
 * Gets quick actions (top 3 priority recommendations)
 */
export function getQuickActions(report: RuaReport): Recommendation[] {
  const recommendations = generateRecommendations(report);
  return recommendations.slice(0, 3);
}

/**
 * Generates a DNS record update checklist
 */
export function generateDnsChecklist(report: RuaReport): string[] {
  const recommendations = generateRecommendations(report);
  const dnsRecs = recommendations
    .filter((r) => r.dnsRecords && r.dnsRecords.length > 0)
    .flatMap((r) => r.dnsRecords || []);

  return [...new Set(dnsRecs)];
}
