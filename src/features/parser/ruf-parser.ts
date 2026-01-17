/**
 * RUF (Forensic Report) XML Parser
 *
 * Parses DMARC forensic reports (RUF) into typed domain objects.
 * Uses functional programming patterns with Either for error handling.
 */

import { XMLParser } from 'fast-xml-parser';
import type { RufReport, ParseError } from '../../shared/types/index.js';
import { left, right } from '../../shared/types/index.js';
import { safeValidateRufReport, type RufReportRaw } from './validators.js';

// ============================================================================
// Parser Configuration
// ============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  ignoreDeclaration: true,
  processEntities: true,
  allowBooleanAttributes: true,
});

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Creates a ParseError with structured information
 */
const createParseError = (
  code: ParseError['code'],
  message: string,
  details?: unknown
): ParseError => ({
  code,
  message,
  details,
});

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transforms validated RUF data into domain types
 */
const transformRufReport = (raw: RufReportRaw): RufReport => {
  const { feedback } = raw;

  return {
    reportMetadata: {
      orgName: feedback.report_metadata.org_name,
      email: feedback.report_metadata.email,
      reportId: feedback.report_metadata.report_id,
      dateRange: {
        begin: new Date(feedback.report_metadata.date_range.begin * 1000),
        end: new Date(feedback.report_metadata.date_range.end * 1000),
      },
    },
    policyPublished: {
      domain: feedback.policy_published.domain,
      adkim: feedback.policy_published.adkim,
      aspf: feedback.policy_published.aspf,
      p: feedback.policy_published.p,
      sp: feedback.policy_published.sp,
      pct: feedback.policy_published.pct,
      fo: feedback.policy_published.fo,
    },
    record: {
      row: {
        sourceIp: feedback.record.row.source_ip,
        policyEvaluated: {
          disposition: feedback.record.row.policy_evaluated.disposition,
          dkim: feedback.record.row.policy_evaluated.dkim,
          spf: feedback.record.row.policy_evaluated.spf,
          reason: feedback.record.row.policy_evaluated.reason?.map((r) => ({
            type: r.type,
            comment: r.comment,
          })),
        },
      },
      identifiers: {
        headerFrom: feedback.record.identifiers.header_from,
        envelopeFrom: feedback.record.identifiers.envelope_from,
        envelopeTo: feedback.record.identifiers.envelope_to,
      },
      authResults: {
        dkim: feedback.record.auth_results.dkim.map((dkim) => ({
          domain: dkim.domain,
          result: dkim.result,
          selector: dkim.selector,
          humanResult: dkim.human_result,
        })),
        spf: feedback.record.auth_results.spf.map((spf) => ({
          domain: spf.domain,
          result: spf.result,
          scope: spf.scope,
        })),
      },
      sample: feedback.record.sample
        ? {
            headers: feedback.record.sample.headers,
            body: feedback.record.sample.body,
          }
        : undefined,
    },
  };
};

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parses a RUF XML string into a typed RufReport
 *
 * @param xmlString - Raw XML string from DMARC forensic report
 * @returns Either<ParseError, RufReport> - Left for errors, Right for success
 *
 * @example
 * ```typescript
 * const result = parseRufXml(xmlContent);
 *
 * if (isRight(result)) {
 *   console.log('Report from:', result.right.reportMetadata.orgName);
 *   console.log('Source IP:', result.right.record.row.sourceIp);
 *   console.log('Sample headers:', result.right.record.sample?.headers);
 * } else {
 *   console.error('Parse failed:', result.left.message);
 * }
 * ```
 */
export const parseRufXml = (
  xmlString: string
): { _tag: 'Left'; left: ParseError } | { _tag: 'Right'; right: RufReport } => {
  // Step 1: Parse XML
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xmlString);
  } catch (error) {
    return left(
      createParseError(
        'XML_PARSE_ERROR',
        'Failed to parse XML',
        error instanceof Error ? error.message : error
      )
    );
  }

  // Step 2: Validate structure with Zod
  const validationResult = safeValidateRufReport(parsed);
  if (!validationResult.success) {
    return left(
      createParseError(
        'VALIDATION_ERROR',
        'XML structure does not match DMARC RUF format',
        validationResult.error.format()
      )
    );
  }

  // Step 3: Transform to domain types
  try {
    const report = transformRufReport(validationResult.data);
    return right(report);
  } catch (error) {
    return left(
      createParseError(
        'TRANSFORMATION_ERROR',
        'Failed to transform parsed data to domain types',
        error instanceof Error ? error.message : error
      )
    );
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts authentication failure details from a RUF report
 */
export const extractFailureDetails = (
  report: RufReport
): {
  sourceIp: string;
  disposition: string;
  dkimResult: string;
  spfResult: string;
  headerFrom: string;
  envelopeFrom?: string;
} => ({
  sourceIp: report.record.row.sourceIp,
  disposition: report.record.row.policyEvaluated.disposition,
  dkimResult: report.record.row.policyEvaluated.dkim,
  spfResult: report.record.row.policyEvaluated.spf,
  headerFrom: report.record.identifiers.headerFrom,
  envelopeFrom: report.record.identifiers.envelopeFrom,
});

/**
 * Checks if the report contains email sample data
 */
export const hasSample = (report: RufReport): boolean => {
  return report.record.sample !== undefined;
};

/**
 * Extracts the full email headers from the sample
 */
export const getSampleHeaders = (report: RufReport): string | undefined => {
  return report.record.sample?.headers;
};

/**
 * Extracts the email body from the sample (if available)
 */
export const getSampleBody = (report: RufReport): string | undefined => {
  return report.record.sample?.body;
};

/**
 * Determines if this is a DKIM failure
 */
export const isDkimFailure = (report: RufReport): boolean => {
  return report.record.row.policyEvaluated.dkim === 'fail';
};

/**
 * Determines if this is a SPF failure
 */
export const isSpfFailure = (report: RufReport): boolean => {
  return report.record.row.policyEvaluated.spf === 'fail';
};

/**
 * Determines if this is an alignment failure
 */
export const isAlignmentFailure = (report: RufReport): boolean => {
  const { headerFrom, envelopeFrom } = report.record.identifiers;
  return envelopeFrom !== undefined && headerFrom !== envelopeFrom;
};

/**
 * Gets all override reasons from the policy evaluation
 */
export const getOverrideReasons = (
  report: RufReport
): Array<{ type: string; comment?: string }> => {
  return report.record.row.policyEvaluated.reason
    ? [...report.record.row.policyEvaluated.reason]
    : [];
};
