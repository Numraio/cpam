/**
 * Tests for Encryption Utilities
 */

import {
  encryptEnvelope,
  decryptEnvelope,
  serializeEnvelope,
  deserializeEnvelope,
  generateApiKey,
  hashValue,
  secureCompare,
} from '@/lib/crypto/encryption';

describe('Envelope Encryption', () => {
  it('encrypts and decrypts plaintext', () => {
    const plaintext = 'sensitive data';
    const envelope = encryptEnvelope(plaintext);
    const decrypted = decryptEnvelope(envelope);

    expect(decrypted).toBe(plaintext);
  });

  it('produces different encrypted data for same plaintext', () => {
    const plaintext = 'sensitive data';
    const envelope1 = encryptEnvelope(plaintext);
    const envelope2 = encryptEnvelope(plaintext);

    // Should be different due to random IV and DEK
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
    expect(envelope1.encryptedDek).not.toBe(envelope2.encryptedDek);
    expect(envelope1.iv).not.toBe(envelope2.iv);

    // But both should decrypt to same plaintext
    expect(decryptEnvelope(envelope1)).toBe(plaintext);
    expect(decryptEnvelope(envelope2)).toBe(plaintext);
  });

  it('encrypts JSON data', () => {
    const data = {
      apiKey: 'sk_test_123',
      apiSecret: 'secret_456',
    };

    const plaintext = JSON.stringify(data);
    const envelope = encryptEnvelope(plaintext);
    const decrypted = decryptEnvelope(envelope);
    const parsed = JSON.parse(decrypted);

    expect(parsed).toEqual(data);
  });

  it('throws error if envelope is tampered with', () => {
    const plaintext = 'sensitive data';
    const envelope = encryptEnvelope(plaintext);

    // Tamper with ciphertext
    envelope.ciphertext = envelope.ciphertext + 'X';

    expect(() => decryptEnvelope(envelope)).toThrow();
  });

  it('includes version in envelope', () => {
    const plaintext = 'sensitive data';
    const envelope = encryptEnvelope(plaintext);

    expect(envelope.version).toBe(1);
  });
});

describe('Serialization', () => {
  it('serializes and deserializes envelope', () => {
    const plaintext = 'sensitive data';
    const envelope = encryptEnvelope(plaintext);
    const serialized = serializeEnvelope(envelope);
    const deserialized = deserializeEnvelope(serialized);

    expect(deserialized).toEqual(envelope);

    // Verify decryption works
    const decrypted = decryptEnvelope(deserialized);
    expect(decrypted).toBe(plaintext);
  });
});

describe('API Key Generation', () => {
  it('generates API key with prefix', () => {
    const key = generateApiKey('sk');

    expect(key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
  });

  it('generates different keys each time', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1).not.toBe(key2);
  });
});

describe('Hashing', () => {
  it('hashes value consistently', () => {
    const value = 'secret_123';
    const hash1 = hashValue(value);
    const hash2 = hashValue(value);

    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different values', () => {
    const hash1 = hashValue('secret_123');
    const hash2 = hashValue('secret_456');

    expect(hash1).not.toBe(hash2);
  });
});

describe('Secure Comparison', () => {
  it('returns true for equal strings', () => {
    const result = secureCompare('secret_123', 'secret_123');

    expect(result).toBe(true);
  });

  it('returns false for different strings', () => {
    const result = secureCompare('secret_123', 'secret_456');

    expect(result).toBe(false);
  });

  it('returns false for different lengths', () => {
    const result = secureCompare('short', 'longer string');

    expect(result).toBe(false);
  });

  it('is timing-safe', () => {
    // This is a basic check - true timing-safe validation requires statistical analysis
    const str1 = 'a'.repeat(100);
    const str2 = 'b'.repeat(100);

    const start1 = Date.now();
    secureCompare(str1, str2);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    secureCompare(str1, str1);
    const time2 = Date.now() - start2;

    // Both should take similar time (within reasonable margin)
    // This is a weak test but better than nothing
    expect(Math.abs(time1 - time2)).toBeLessThan(10);
  });
});

describe('Full Integration', () => {
  it('encrypts, stores, retrieves, and decrypts credentials', () => {
    const credentials = {
      apiKey: 'platts_api_key_123',
      apiSecret: 'platts_api_secret_456',
      username: 'user@example.com',
    };

    // Encrypt
    const plaintext = JSON.stringify(credentials);
    const envelope = encryptEnvelope(plaintext);

    // Serialize for storage
    const serialized = serializeEnvelope(envelope);

    // Simulate storage/retrieval
    const retrieved = serialized;

    // Deserialize
    const deserialized = deserializeEnvelope(retrieved);

    // Decrypt
    const decrypted = decryptEnvelope(deserialized);

    // Parse
    const parsed = JSON.parse(decrypted);

    expect(parsed).toEqual(credentials);
  });
});
