/**
 * RUA (Aggregate Report) XML Parser
 *
 * Parses DMARC aggregate reports (RUA) from XML format into typed data structures.
 * Follows functional programming principles with pure functions and Either type for error handling.
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  RuaReport,
  RuaRecord,
  ReportMetadata,
  PolicyPublished,
  Either,
  ParseError,
} from '../../shared/types/index.js';
import { left, right } from '../../shared/types/index.js';
import { safeValidateRuaReport, type RuaReportRaw } from './validators.js';

// ============================================================================
// Parser Configuration
// ============================================================================

/**
 * XML Parser configuration for DMARC reports
 */
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreDeclaration: true,
  ignorePiTags: true,
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  cdataPropName: '__cdata',
  numberParseOptions: {
    hex: false,
    leadingZeros: false,
  },
};

const xmlParser = new XMLParser(parserOptions);

// ============================================================================
// Error Creation Helpers
// ============================================================================

/**
 * Creates a ParseError object
 */
const createParseError = (code: string, message: string, details?: unknown): ParseError => ({
  code,
  message,
  details,
});

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transforms report metadata from raw format to domain type
 * @pure
 */
const transformReportMetadata = (
  raw: RuaReportRaw['feedback']['report_metadata']
): ReportMetadata => ({
  orgName: raw.org_name,
  email: raw.email,
  reportId: raw.report_id,
  dateRange: {
    begin: new Date(raw.date_range.begin * 1000), // Convert Unix timestamp to Date
    end: new Date(raw.date_range.end * 1000),
  },
  errors: raw.error,
});

/**
 * Transforms policy published from raw format to domain type
 * @pure
 */
const transformPolicyPublished = (
  raw: RuaReportRaw['feedback']['policy_published']
): PolicyPublished => ({
  domain: raw.domain,
  adkim: raw.adkim,
  aspf: raw.aspf,
  p: raw.p,
  sp: raw.sp || raw.p, // Default to main policy if subdomain policy not specified
  pct: raw.pct,
  fo: raw.fo,
});

/**
 * Transforms a single RUA record from raw format to domain type
 * @pure
 */
const transformRuaRecord = (raw: RuaReportRaw['feedback']['record'][number]): RuaRecord => ({
  row: {
    sourceIp: raw.row.source_ip,
    count: raw.row.count,
    policyEvaluated: {
      disposition: raw.row.policy_evaluated.disposition,
      dkim: raw.row.policy_evaluated.dkim,
      spf: raw.row.policy_evaluated.spf,
      reason: raw.row.policy_evaluated.reason?.map((r) => ({
        type: r.type,
        comment: r.comment,
      })),
    },
  },
  identifiers: {
    headerFrom: raw.identifiers.header_from,
    envelopeFrom: raw.identifiers.envelope_from,
    envelopeTo: raw.identifiers.envelope_to,
  },
  authResults: {
    dkim: raw.auth_results.dkim.map((d) => ({
      domain: d.domain,
      result: d.result,
      selector: d.selector,
      humanResult: d.human_result,
    })),
    spf: raw.auth_results.spf.map((s) => ({
      domain: s.domain,
      result: s.result,
      scope: s.scope,
    })),
  },
});

/**
 * Transforms complete raw report to domain type
 * @pure
 */
const transformRuaReport = (raw: RuaReportRaw): RuaReport => ({
  reportMetadata: transformReportMetadata(raw.feedback.report_metadata),
  policyPublished: transformPolicyPublished(raw.feedback.policy_published),
  records: raw.feedback.record.map(transformRuaRecord),
});

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parses a DMARC RUA XML string into a typed RuaReport
 *
 * This is a pure function that:
 * 1. Parses XML to JavaScript object
 * 2. Validates structure with Zod schema
 * 3. Transforms to domain types
 * 4. Returns Either<ParseError, RuaReport>
 *
 * @param xmlString - The raw XML string from a DMARC aggregate report
 * @returns Either<ParseError, RuaReport> - Success (Right) or failure (Left)
 *
 * @example
 * ```typescript
 * const result = parseRuaXml(xmlString);
 * if (isRight(result)) {
 *   const report = result.right;
 *   console.log(`Parsed ${report.records.length} records`);
 * } else {
 *   console.error(`Parse error: ${result.left.message}`);
 * }
 * ```
 */
export const parseRuaXml = (xmlString: string): Either<ParseError, RuaReport> => {
  // Step 1: Parse XML to JavaScript object
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xmlString);
  } catch (error) {
    return left(
      createParseError(
        'XML_PARSE_ERROR',
        'Failed to parse XML',
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  // Step 2: Validate with Zod schema
  const validationResult = safeValidateRuaReport(parsed);
  if (!validationResult.success) {
    return left(
      createParseError(
        'VALIDATION_ERROR',
        'XML structure does not match DMARC RUA format',
        validationResult.error.format()
      )
    );
  }

  // Step 3: Transform to domain types
  try {
    const report = transformRuaReport(validationResult.data);
    return right(report);
  } catch (error) {
    return left(
      createParseError(
        'TRANSFORMATION_ERROR',
        'Failed to transform parsed data to domain types',
        error instanceof Error ? error.message : String(error)
      )
    );
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts all unique source IPs from a report
 * @pure
 */
export const extractSourceIps = (report: RuaReport): readonly string[] => {
  const ips = new Set(report.records.map((record) => record.row.sourceIp));
  return Array.from(ips);
};

/**
 * Extracts all unique domains from auth results
 * @pure
 */
export const extractDomains = (report: RuaReport): readonly string[] => {
  const domains = new Set<string>();

  report.records.forEach((record) => {
    record.authResults.dkim.forEach((d) => domains.add(d.domain));
    record.authResults.spf.forEach((s) => domains.add(s.domain));
    domains.add(record.identifiers.headerFrom);
    if (record.identifiers.envelopeFrom) {
      domains.add(record.identifiers.envelopeFrom);
    }
  });

  return Array.from(domains);
};

/**
 * Calculates total email count from a report
 * @pure
 */
export const calculateTotalEmails = (report: RuaReport): number => {
  return report.records.reduce((total, record) => total + record.row.count, 0);
};

/**
 * Filters records by disposition
 * @pure
 */
export const filterByDisposition = (
  records: readonly RuaRecord[],
  disposition: 'none' | 'quarantine' | 'reject'
): readonly RuaRecord[] => {
  return records.filter((record) => record.row.policyEvaluated.disposition === disposition);
};

/**
 * Filters records by authentication result
 * @pure
 */
export const filterByAuthResult = (
  records: readonly RuaRecord[],
  type: 'spf' | 'dkim',
  result: 'pass' | 'fail'
): readonly RuaRecord[] => {
  return records.filter((record) => record.row.policyEvaluated[type] === result);
};

/**
 * Groups records by source IP
 * @pure
 */
export const groupBySourceIp = (
  records: readonly RuaRecord[]
): Map<string, readonly RuaRecord[]> => {
  const groups = new Map<string, RuaRecord[]>();

  records.forEach((record) => {
    const ip = record.row.sourceIp;
    const existing = groups.get(ip) || [];
    groups.set(ip, [...existing, record]);
  });

  // Convert to readonly
  return new Map(
    Array.from(groups.entries()).map(([ip, records]) => [ip, records as readonly RuaRecord[]])
  );
};
