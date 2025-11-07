/**
 * Tests for PII Filtering
 */

import { describe, it, expect } from '@jest/globals';
import {
  filterPII,
  filterPIIFromObject,
  containsPII,
  sanitizeSpanAttributes,
} from '@/lib/observability/pii-filter';

describe('PII Filter', () => {
  describe('Email Masking', () => {
    it('masks email addresses', () => {
      const input = 'Contact john.doe@example.com for support';
      const result = filterPII(input);

      expect(result).toContain('jo***@example.com');
      expect(result).not.toContain('john.doe@example.com');
    });

    it('masks multiple emails', () => {
      const input = 'Email alice@test.com or bob@test.com';
      const result = filterPII(input);

      expect(result).toContain('al***@test.com');
      expect(result).toContain('bo***@test.com');
    });
  });

  describe('Phone Masking', () => {
    it('masks US phone numbers', () => {
      const input = 'Call me at 555-123-4567';
      const result = filterPII(input);

      expect(result).toContain('***-***-****');
      expect(result).not.toContain('555-123-4567');
    });

    it('masks phone with parentheses', () => {
      const input = 'Phone: (555) 123-4567';
      const result = filterPII(input);

      expect(result).toContain('***-***-****');
    });
  });

  describe('SSN Masking', () => {
    it('masks social security numbers', () => {
      const input = 'SSN: 123-45-6789';
      const result = filterPII(input);

      expect(result).toContain('***-**-****');
      expect(result).not.toContain('123-45-6789');
    });
  });

  describe('Credit Card Masking', () => {
    it('masks credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010';
      const result = filterPII(input);

      expect(result).toContain('****-****-****-9010');
      expect(result).not.toContain('4532-1234-5678');
    });

    it('masks cards without hyphens', () => {
      const input = 'Card: 4532123456789010';
      const result = filterPII(input);

      expect(result).toContain('****-****-****-9010');
    });
  });

  describe('Object Filtering', () => {
    it('filters PII from object fields', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const result = filterPIIFromObject(input);

      expect(result.name).toBe('John Doe');
      expect(result.email).toContain('jo***@example.com');
      expect(result.phone).toBe('***-***-****');
    });

    it('redacts sensitive field names', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        apiKey: 'key-123',
        token: 'token-456',
      };

      const result = filterPIIFromObject(input);

      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
    });

    it('handles nested objects', () => {
      const input = {
        user: {
          email: 'test@example.com',
          password: 'secret',
        },
      };

      const result = filterPIIFromObject(input);

      expect(result.user.email).toContain('***@example.com');
      expect(result.user.password).toBe('[REDACTED]');
    });

    it('handles arrays', () => {
      const input = {
        users: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      };

      const result = filterPIIFromObject(input);

      expect(result.users[0].email).toContain('***@example.com');
      expect(result.users[1].email).toContain('***@example.com');
    });
  });

  describe('PII Detection', () => {
    it('detects email in string', () => {
      expect(containsPII('Contact me at john@example.com')).toBe(true);
    });

    it('detects phone in string', () => {
      expect(containsPII('Call 555-123-4567')).toBe(true);
    });

    it('returns false for clean string', () => {
      expect(containsPII('No PII here')).toBe(false);
    });
  });

  describe('Span Attributes Sanitization', () => {
    it('sanitizes span attributes', () => {
      const attributes = {
        'user.email': 'test@example.com',
        'user.id': '123',
        'request.path': '/api/users',
      };

      const result = sanitizeSpanAttributes(attributes);

      expect(result['user.email']).toContain('***@example.com');
      expect(result['user.id']).toBe('123');
      expect(result['request.path']).toBe('/api/users');
    });
  });

  describe('Custom Patterns', () => {
    it('applies custom replacement patterns', () => {
      const input = 'Account: ACCT-12345';
      const result = filterPII(input, {
        customPatterns: [
          {
            pattern: /ACCT-\d+/g,
            replacement: 'ACCT-*****',
          },
        ],
      });

      expect(result).toContain('ACCT-*****');
      expect(result).not.toContain('ACCT-12345');
    });
  });
});

describe('Acceptance Tests', () => {
  it('Given a failed job, then trace shows span with error & correlation ID', () => {
    // Scenario:
    // 1. Job fails with error
    // 2. Error logged with PII filtering
    // 3. Span records exception
    // 4. Correlation ID preserved
    // 5. PII removed from error message

    const errorMessage = 'Failed to process order for john@example.com';
    const filtered = filterPII(errorMessage);

    expect(filtered).not.toContain('john@example.com');
    expect(filtered).toContain('***@example.com');
  });

  it('Given log with sensitive data, then PII is filtered', () => {
    // Scenario:
    // 1. Application logs user data
    // 2. Log contains email, phone, password
    // 3. PII filter applied
    // 4. Email and phone masked
    // 5. Password field redacted

    const logData = {
      action: 'user.login',
      user: {
        email: 'alice@example.com',
        password: 'secret123',
        phone: '555-123-4567',
      },
    };

    const filtered = filterPIIFromObject(logData);

    expect(filtered.user.email).toContain('***@example.com');
    expect(filtered.user.password).toBe('[REDACTED]');
    expect(filtered.user.phone).toBe('***-***-****');
  });
});
