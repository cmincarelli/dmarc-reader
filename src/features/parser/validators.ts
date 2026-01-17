/**
 * Zod Validation Schemas for DMARC Reports
 *
 * These schemas validate the structure and types of parsed XML data,
 * ensuring type safety at runtime.
 */

import { z } from 'zod';

// ============================================================================
// Common Validators
// ============================================================================

/**
 * Validates IP addresses (IPv4 and IPv6)
 */
const ipAddressSchema = z.string().refine(
  (value) => {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    return ipv4Pattern.test(value) || ipv6Pattern.test(value);
  },
  { message: 'Invalid IP address format' }
);

/**
 * Validates email addresses
 */
const emailSchema = z.string().email();

/**
 * Validates domain names
 */
const domainSchema = z.string().min(1);

/**
 * Validates Unix timestamps (converts to Date)
 */
const unixTimestampSchema = z.union([
  z.number().int().positive(),
  z.string().transform((val) => parseInt(val, 10)),
]);

// ============================================================================
// RUA (Aggregate Report) Schemas
// ============================================================================

/**
 * Report Metadata Schema
 */
const reportMetadataSchema = z.object({
  org_name: z.string(),
  email: emailSchema,
  report_id: z.union([z.string(), z.number().transform(String)]), // Handle numeric report IDs
  date_range: z.object({
    begin: unixTimestampSchema,
    end: unixTimestampSchema,
  }),
  error: z.array(z.string()).optional(),
});

/**
 * Policy Published Schema
 */
const policyPublishedSchema = z.object({
  domain: domainSchema,
  adkim: z.enum(['r', 's']).default('r'), // Relaxed or Strict
  aspf: z.enum(['r', 's']).default('r'),
  p: z.enum(['none', 'quarantine', 'reject']),
  sp: z.enum(['none', 'quarantine', 'reject']).optional(),
  pct: z.union([z.number(), z.string().transform((val) => parseInt(val, 10))]).default(100),
  fo: z.union([z.string(), z.number().transform(String)]).optional(),
});

/**
 * Policy Override Reason Schema
 */
const policyOverrideReasonSchema = z.object({
  type: z.string(),
  comment: z.string().optional(),
});

/**
 * Helper to handle single value or array (fast-xml-parser quirk)
 */
const arrayOrSingle = <T>(schema: z.ZodType<T>) =>
  z.union([z.array(schema), schema.transform((val) => [val])]);

/**
 * Policy Evaluated Schema
 */
const policyEvaluatedSchema = z.object({
  disposition: z.enum(['none', 'quarantine', 'reject']),
  dkim: z.enum(['pass', 'fail', 'neutral', 'none']),
  spf: z.enum(['pass', 'fail', 'neutral', 'none']),
  reason: arrayOrSingle(policyOverrideReasonSchema).optional(),
});

/**
 * DKIM Auth Result Schema
 */
const dkimAuthResultSchema = z.object({
  domain: domainSchema,
  result: z.enum(['pass', 'fail', 'neutral', 'none', 'temperror', 'permerror']),
  selector: z.string().optional(),
  human_result: z.string().optional(),
});

/**
 * SPF Auth Result Schema
 */
const spfAuthResultSchema = z.object({
  domain: domainSchema,
  result: z.enum(['pass', 'fail', 'neutral', 'none', 'temperror', 'permerror']),
  scope: z.enum(['helo', 'mfrom']).optional(),
});

/**
 * Auth Results Schema
 */
const authResultsSchema = z.object({
  dkim: z.union([z.array(dkimAuthResultSchema), dkimAuthResultSchema.transform((val) => [val])]),
  spf: z.union([z.array(spfAuthResultSchema), spfAuthResultSchema.transform((val) => [val])]),
});

/**
 * Identifiers Schema
 */
const identifiersSchema = z.object({
  header_from: domainSchema,
  envelope_from: domainSchema.optional(),
  envelope_to: domainSchema.optional(),
});

/**
 * Row Schema
 */
const rowSchema = z.object({
  source_ip: ipAddressSchema,
  count: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .pipe(z.number().int().positive()),
  policy_evaluated: policyEvaluatedSchema,
});

/**
 * RUA Record Schema
 */
const ruaRecordSchema = z.object({
  row: rowSchema,
  identifiers: identifiersSchema,
  auth_results: authResultsSchema,
});

/**
 * Complete RUA Report Schema
 */
export const ruaReportSchema = z.object({
  feedback: z.object({
    report_metadata: reportMetadataSchema,
    policy_published: policyPublishedSchema,
    record: z.union([
      z.array(ruaRecordSchema),
      ruaRecordSchema.transform((val) => [val]), // Handle single record
    ]),
  }),
});

// ============================================================================
// RUF (Forensic Report) Schemas
// ============================================================================

/**
 * RUF Report Metadata Schema
 */
const rufReportMetadataSchema = z.object({
  org_name: z.string(),
  email: emailSchema,
  report_id: z.string(),
  date_range: z.object({
    begin: unixTimestampSchema,
    end: unixTimestampSchema,
  }),
});

/**
 * RUF Sample Schema
 */
const rufSampleSchema = z.object({
  headers: z.string(),
  body: z.string().optional(),
});

/**
 * RUF Record Schema
 */
const rufRecordSchema = z.object({
  row: z.object({
    source_ip: ipAddressSchema,
    policy_evaluated: policyEvaluatedSchema,
  }),
  identifiers: identifiersSchema,
  auth_results: authResultsSchema,
  sample: rufSampleSchema.optional(),
});

/**
 * Complete RUF Report Schema
 */
export const rufReportSchema = z.object({
  feedback: z.object({
    report_metadata: rufReportMetadataSchema,
    policy_published: policyPublishedSchema,
    record: rufRecordSchema,
  }),
});

// ============================================================================
// Type Inference
// ============================================================================

export type RuaReportRaw = z.infer<typeof ruaReportSchema>;
export type RufReportRaw = z.infer<typeof rufReportSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates and parses a RUA report
 */
export const validateRuaReport = (data: unknown): RuaReportRaw => {
  return ruaReportSchema.parse(data);
};

/**
 * Safely validates a RUA report (returns result instead of throwing)
 */
export const safeValidateRuaReport = (
  data: unknown
): z.SafeParseReturnType<unknown, RuaReportRaw> => {
  return ruaReportSchema.safeParse(data);
};

/**
 * Validates and parses a RUF report
 */
export const validateRufReport = (data: unknown): RufReportRaw => {
  return rufReportSchema.parse(data);
};

/**
 * Safely validates a RUF report (returns result instead of throwing)
 */
export const safeValidateRufReport = (
  data: unknown
): z.SafeParseReturnType<unknown, RufReportRaw> => {
  return rufReportSchema.safeParse(data);
};
