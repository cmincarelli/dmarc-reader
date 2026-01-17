/**
 * RUF Parser Tests
 *
 * Comprehensive test suite for the RUF (forensic report) XML parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseRufXml,
  extractFailureDetails,
  hasSample,
  getSampleHeaders,
  getSampleBody,
  isDkimFailure,
  isSpfFailure,
  isAlignmentFailure,
  getOverrideReasons,
} from '../ruf-parser';
import { isRight, isLeft } from '@shared/types';

// ============================================================================
// Test Helpers
// ============================================================================

const loadFixture = (filename: string): string => {
  const fixturePath = join(process.cwd(), 'tests', 'fixtures', filename);
  return readFileSync(fixturePath, 'utf-8');
};

// ============================================================================
// Parser Tests
// ============================================================================

describe('parseRufXml', () => {
  describe('Valid XML', () => {
    it('should parse a simple valid RUF report', () => {
      const xml = loadFixture('sample-ruf-simple.xml');
      const result = parseRufXml(xml);

      if (isLeft(result)) {
        console.log('Parse error:', result.left);
        console.log('Details:', JSON.stringify(result.left.details, null, 2));
      }

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        const report = result.right;

        // Check metadata
        expect(report.reportMetadata.orgName).toBe('Yahoo! Inc.');
        expect(report.reportMetadata.email).toBe('dmarc-noreply@yahoo-inc.com');
        expect(report.reportMetadata.reportId).toBe('ruf-12345678-abcd-efgh');
        expect(report.reportMetadata.dateRange.begin).toBeInstanceOf(Date);
        expect(report.reportMetadata.dateRange.end).toBeInstanceOf(Date);

        // Check policy
        expect(report.policyPublished.domain).toBe('example.com');
        expect(report.policyPublished.p).toBe('quarantine');
        expect(report.policyPublished.adkim).toBe('r');
        expect(report.policyPublished.aspf).toBe('r');

        // Check record
        expect(report.record.row.sourceIp).toBe('198.51.100.25');
        expect(report.record.row.policyEvaluated.disposition).toBe('quarantine');
        expect(report.record.row.policyEvaluated.dkim).toBe('fail');
        expect(report.record.row.policyEvaluated.spf).toBe('fail');

        // Check identifiers
        expect(report.record.identifiers.headerFrom).toBe('example.com');
        expect(report.record.identifiers.envelopeFrom).toBe('spammer.example.net');

        // Check auth results
        expect(report.record.authResults.dkim).toHaveLength(1);
        expect(report.record.authResults.dkim[0].domain).toBe('spammer.example.net');
        expect(report.record.authResults.dkim[0].result).toBe('fail');

        expect(report.record.authResults.spf).toHaveLength(1);
        expect(report.record.authResults.spf[0].domain).toBe('spammer.example.net');
        expect(report.record.authResults.spf[0].result).toBe('fail');

        // No sample data in simple report
        expect(report.record.sample).toBeUndefined();
      }
    });

    it('should parse a complex RUF report with sample data', () => {
      const xml = loadFixture('sample-ruf-complex.xml');
      const result = parseRufXml(xml);

      if (isLeft(result)) {
        console.log('Complex parse error:', result.left.code);
        console.log('Details:', JSON.stringify(result.left.details, null, 2));
      }

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        const report = result.right;

        // Check metadata
        expect(report.reportMetadata.orgName).toBe('Amazon SES');
        expect(report.reportMetadata.reportId).toBe('ruf-ses-2024-01-15-abc123');

        // Check policy
        expect(report.policyPublished.domain).toBe('secure-domain.com');
        expect(report.policyPublished.p).toBe('reject');
        expect(report.policyPublished.adkim).toBe('s'); // Strict
        expect(report.policyPublished.aspf).toBe('s'); // Strict
        expect(report.policyPublished.fo).toBe('1');

        // Check record
        expect(report.record.row.sourceIp).toBe('203.0.113.42');
        expect(report.record.row.policyEvaluated.disposition).toBe('reject');
        expect(report.record.row.policyEvaluated.dkim).toBe('fail');
        expect(report.record.row.policyEvaluated.spf).toBe('pass');

        // Check override reason
        expect(report.record.row.policyEvaluated.reason).toBeDefined();
        expect(report.record.row.policyEvaluated.reason).toHaveLength(1);
        expect(report.record.row.policyEvaluated.reason![0].type).toBe('local_policy');
        expect(report.record.row.policyEvaluated.reason![0].comment).toBe(
          'SPF passed but DKIM failed with strict alignment'
        );

        // Check identifiers
        expect(report.record.identifiers.headerFrom).toBe('secure-domain.com');
        expect(report.record.identifiers.envelopeFrom).toBe('mail.secure-domain.com');
        expect(report.record.identifiers.envelopeTo).toBe('recipient@example.org');

        // Check multiple DKIM results
        expect(report.record.authResults.dkim).toHaveLength(2);
        expect(report.record.authResults.dkim[0].domain).toBe('mail.secure-domain.com');
        expect(report.record.authResults.dkim[0].result).toBe('fail');
        expect(report.record.authResults.dkim[0].selector).toBe('selector1');
        expect(report.record.authResults.dkim[0].humanResult).toBe('signature verification failed');

        expect(report.record.authResults.dkim[1].domain).toBe('other-domain.com');
        expect(report.record.authResults.dkim[1].result).toBe('none');

        // Check SPF results
        expect(report.record.authResults.spf).toHaveLength(1);
        expect(report.record.authResults.spf[0].domain).toBe('mail.secure-domain.com');
        expect(report.record.authResults.spf[0].result).toBe('pass');

        // Check sample data
        expect(report.record.sample).toBeDefined();
        expect(report.record.sample!.headers).toContain('From: sender@secure-domain.com');
        expect(report.record.sample!.headers).toContain('DKIM-Signature:');
        expect(report.record.sample!.body).toBeDefined();
        expect(report.record.sample!.body).toContain('Dear valued customer');
      }
    });
  });

  describe('Invalid XML', () => {
    it('should return error for malformed XML', () => {
      const invalidXml = '<feedback><broken>';
      const result = parseRufXml(invalidXml);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        // fast-xml-parser is lenient, so this will be a validation error
        expect(result.left.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for non-RUF XML structure', () => {
      const wrongStructure = '<root><not>a dmarc report</not></root>';
      const result = parseRufXml(wrongStructure);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        expect(result.left.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for invalid data types', () => {
      const xml = loadFixture('sample-ruf-invalid.xml');
      const result = parseRufXml(xml);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        expect(result.left.code).toBe('VALIDATION_ERROR');
        expect(result.left.details).toBeDefined();
      }
    });

    it('should return error for empty string', () => {
      const result = parseRufXml('');

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        // Empty string parses as empty object, fails validation
        expect(result.left.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('extractFailureDetails', () => {
  it('should extract all failure details from a RUF report', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      const details = extractFailureDetails(result.right);

      expect(details.sourceIp).toBe('198.51.100.25');
      expect(details.disposition).toBe('quarantine');
      expect(details.dkimResult).toBe('fail');
      expect(details.spfResult).toBe('fail');
      expect(details.headerFrom).toBe('example.com');
      expect(details.envelopeFrom).toBe('spammer.example.net');
    }
  });
});

describe('hasSample', () => {
  it('should return false when report has no sample data', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(hasSample(result.right)).toBe(false);
    }
  });

  it('should return true when report has sample data', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(hasSample(result.right)).toBe(true);
    }
  });
});

describe('getSampleHeaders', () => {
  it('should return undefined for report without sample', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(getSampleHeaders(result.right)).toBeUndefined();
    }
  });

  it('should return headers for report with sample', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      const headers = getSampleHeaders(result.right);
      expect(headers).toBeDefined();
      expect(headers).toContain('From: sender@secure-domain.com');
      expect(headers).toContain('DKIM-Signature:');
    }
  });
});

describe('getSampleBody', () => {
  it('should return undefined for report without sample', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(getSampleBody(result.right)).toBeUndefined();
    }
  });

  it('should return body for report with sample', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      const body = getSampleBody(result.right);
      expect(body).toBeDefined();
      expect(body).toContain('Dear valued customer');
    }
  });
});

describe('isDkimFailure', () => {
  it('should return true when DKIM failed', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isDkimFailure(result.right)).toBe(true);
    }
  });

  it('should return true for complex report with DKIM failure', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isDkimFailure(result.right)).toBe(true);
    }
  });
});

describe('isSpfFailure', () => {
  it('should return true when SPF failed', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isSpfFailure(result.right)).toBe(true);
    }
  });

  it('should return false when SPF passed', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isSpfFailure(result.right)).toBe(false);
    }
  });
});

describe('isAlignmentFailure', () => {
  it('should return true when header_from and envelope_from differ', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isAlignmentFailure(result.right)).toBe(true);
    }
  });

  it('should return true for subdomain alignment issues', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      expect(isAlignmentFailure(result.right)).toBe(true);
    }
  });
});

describe('getOverrideReasons', () => {
  it('should return empty array when no override reasons', () => {
    const xml = loadFixture('sample-ruf-simple.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      const reasons = getOverrideReasons(result.right);
      expect(reasons).toEqual([]);
    }
  });

  it('should return override reasons when present', () => {
    const xml = loadFixture('sample-ruf-complex.xml');
    const result = parseRufXml(xml);

    if (isRight(result)) {
      const reasons = getOverrideReasons(result.right);
      expect(reasons).toHaveLength(1);
      expect(reasons[0].type).toBe('local_policy');
      expect(reasons[0].comment).toBe('SPF passed but DKIM failed with strict alignment');
    }
  });
});
