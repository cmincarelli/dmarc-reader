/**
 * RUA Parser Tests
 *
 * Comprehensive test suite for the RUA XML parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseRuaXml,
  extractSourceIps,
  extractDomains,
  calculateTotalEmails,
  filterByDisposition,
  filterByAuthResult,
  groupBySourceIp,
} from '../rua-parser';
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

describe('parseRuaXml', () => {
  describe('Valid XML', () => {
    it('should parse a simple valid RUA report', () => {
      const xml = loadFixture('sample-rua-simple.xml');
      const result = parseRuaXml(xml);

      if (isLeft(result)) {
        console.log('Parse error:', result.left);
        console.log('Details:', JSON.stringify(result.left.details, null, 2));
      }

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        const report = result.right;

        // Check metadata
        expect(report.reportMetadata.orgName).toBe('Google Inc.');
        expect(report.reportMetadata.email).toBe('noreply-dmarc-support@google.com');
        expect(report.reportMetadata.reportId).toBe('1234567890');
        expect(report.reportMetadata.dateRange.begin).toBeInstanceOf(Date);
        expect(report.reportMetadata.dateRange.end).toBeInstanceOf(Date);

        // Check policy
        expect(report.policyPublished.domain).toBe('example.com');
        expect(report.policyPublished.p).toBe('none');
        expect(report.policyPublished.adkim).toBe('r');
        expect(report.policyPublished.aspf).toBe('r');

        // Check records
        expect(report.records).toHaveLength(1);
        expect(report.records[0].row.sourceIp).toBe('192.0.2.1');
        expect(report.records[0].row.count).toBe(5);
        expect(report.records[0].row.policyEvaluated.disposition).toBe('none');
        expect(report.records[0].row.policyEvaluated.dkim).toBe('pass');
        expect(report.records[0].row.policyEvaluated.spf).toBe('pass');
      }
    });

    it('should parse a complex RUA report with multiple records', () => {
      const xml = loadFixture('sample-rua-complex.xml');
      const result = parseRuaXml(xml);

      if (isLeft(result)) {
        console.log('Complex parse error:', result.left.code);
        console.log('Details:', JSON.stringify(result.left.details, null, 2));
      }

      expect(isRight(result)).toBe(true);

      if (isRight(result)) {
        const report = result.right;

        // Check metadata
        expect(report.reportMetadata.orgName).toBe('Microsoft Corporation');
        expect(report.reportMetadata.reportId).toBe('abc123def456');

        // Check policy
        expect(report.policyPublished.domain).toBe('testdomain.com');
        expect(report.policyPublished.p).toBe('quarantine');
        expect(report.policyPublished.adkim).toBe('s'); // Strict

        // Check multiple records
        expect(report.records).toHaveLength(3);

        // First record - passes
        expect(report.records[0].row.sourceIp).toBe('198.51.100.42');
        expect(report.records[0].row.count).toBe(15);
        expect(report.records[0].row.policyEvaluated.dkim).toBe('pass');
        expect(report.records[0].row.policyEvaluated.spf).toBe('pass');

        // Second record - fails
        expect(report.records[1].row.sourceIp).toBe('203.0.113.89');
        expect(report.records[1].row.count).toBe(3);
        expect(report.records[1].row.policyEvaluated.dkim).toBe('fail');
        expect(report.records[1].row.policyEvaluated.spf).toBe('fail');
        expect(report.records[1].row.policyEvaluated.disposition).toBe('quarantine');

        // Third record - forwarded (has reason)
        expect(report.records[2].row.sourceIp).toBe('192.0.2.100');
        expect(report.records[2].row.policyEvaluated.reason).toBeDefined();
        expect(report.records[2].row.policyEvaluated.reason?.[0].type).toBe('forwarded');
      }
    });

    it('should correctly parse auth results', () => {
      const xml = loadFixture('sample-rua-complex.xml');
      const result = parseRuaXml(xml);

      if (isRight(result)) {
        const report = result.right;
        const firstRecord = report.records[0];

        // DKIM results
        expect(firstRecord.authResults.dkim).toHaveLength(1);
        expect(firstRecord.authResults.dkim[0].domain).toBe('testdomain.com');
        expect(firstRecord.authResults.dkim[0].result).toBe('pass');
        expect(firstRecord.authResults.dkim[0].selector).toBe('selector1');

        // SPF results
        expect(firstRecord.authResults.spf).toHaveLength(1);
        expect(firstRecord.authResults.spf[0].domain).toBe('testdomain.com');
        expect(firstRecord.authResults.spf[0].result).toBe('pass');
        expect(firstRecord.authResults.spf[0].scope).toBe('mfrom');
      }
    });

    it('should correctly parse identifiers', () => {
      const xml = loadFixture('sample-rua-complex.xml');
      const result = parseRuaXml(xml);

      if (isRight(result)) {
        const report = result.right;

        expect(report.records[0].identifiers.headerFrom).toBe('testdomain.com');
        expect(report.records[0].identifiers.envelopeFrom).toBe('mail.testdomain.com');

        // Different envelope in second record
        expect(report.records[1].identifiers.envelopeFrom).toBe('suspicious-sender.com');
      }
    });
  });

  describe('Invalid XML', () => {
    it('should return error for malformed XML', () => {
      const invalidXml = '<feedback><broken>';
      const result = parseRuaXml(invalidXml);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        // fast-xml-parser is lenient, so this will be a validation error
        expect(result.left.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for non-RUA XML structure', () => {
      const wrongStructure = '<root><not>a dmarc report</not></root>';
      const result = parseRuaXml(wrongStructure);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        expect(result.left.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for invalid data types', () => {
      const xml = loadFixture('sample-rua-invalid.xml');
      const result = parseRuaXml(xml);

      expect(isLeft(result)).toBe(true);

      if (isLeft(result)) {
        expect(result.left.code).toBe('VALIDATION_ERROR');
        expect(result.left.details).toBeDefined();
      }
    });

    it('should return error for empty string', () => {
      const result = parseRuaXml('');

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

describe('extractSourceIps', () => {
  it('should extract all unique source IPs', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const ips = extractSourceIps(result.right);

      expect(ips).toHaveLength(3);
      expect(ips).toContain('198.51.100.42');
      expect(ips).toContain('203.0.113.89');
      expect(ips).toContain('192.0.2.100');
    }
  });

  it('should handle report with single record', () => {
    const xml = loadFixture('sample-rua-simple.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const ips = extractSourceIps(result.right);

      expect(ips).toHaveLength(1);
      expect(ips[0]).toBe('192.0.2.1');
    }
  });
});

describe('extractDomains', () => {
  it('should extract all unique domains from auth results', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const domains = extractDomains(result.right);

      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain('testdomain.com');
      expect(domains).toContain('mail.testdomain.com');
      expect(domains).toContain('suspicious-sender.com');
      expect(domains).toContain('forwarder.example.net');
    }
  });
});

describe('calculateTotalEmails', () => {
  it('should sum all email counts', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const total = calculateTotalEmails(result.right);

      // 15 + 3 + 8 = 26
      expect(total).toBe(26);
    }
  });

  it('should return correct count for single record', () => {
    const xml = loadFixture('sample-rua-simple.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const total = calculateTotalEmails(result.right);

      expect(total).toBe(5);
    }
  });
});

describe('filterByDisposition', () => {
  it('should filter records by disposition', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const quarantined = filterByDisposition(result.right.records, 'quarantine');
      const none = filterByDisposition(result.right.records, 'none');

      expect(quarantined).toHaveLength(1);
      expect(quarantined[0].row.sourceIp).toBe('203.0.113.89');

      expect(none).toHaveLength(2);
    }
  });
});

describe('filterByAuthResult', () => {
  it('should filter records by SPF result', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const spfPass = filterByAuthResult(result.right.records, 'spf', 'pass');
      const spfFail = filterByAuthResult(result.right.records, 'spf', 'fail');

      expect(spfPass).toHaveLength(1);
      expect(spfFail).toHaveLength(2);
    }
  });

  it('should filter records by DKIM result', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const dkimPass = filterByAuthResult(result.right.records, 'dkim', 'pass');
      const dkimFail = filterByAuthResult(result.right.records, 'dkim', 'fail');

      expect(dkimPass).toHaveLength(2);
      expect(dkimFail).toHaveLength(1);
    }
  });
});

describe('groupBySourceIp', () => {
  it('should group records by source IP', () => {
    const xml = loadFixture('sample-rua-complex.xml');
    const result = parseRuaXml(xml);

    if (isRight(result)) {
      const groups = groupBySourceIp(result.right.records);

      expect(groups.size).toBe(3);
      expect(groups.get('198.51.100.42')).toHaveLength(1);
      expect(groups.get('203.0.113.89')).toHaveLength(1);
      expect(groups.get('192.0.2.100')).toHaveLength(1);
    }
  });

  it('should handle empty records array', () => {
    const groups = groupBySourceIp([]);

    expect(groups.size).toBe(0);
  });
});
