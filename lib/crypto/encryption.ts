/**
 * Encryption Utilities
 *
 * Provides envelope encryption for sensitive data like provider credentials
 */

import crypto from 'crypto';
import env from '../env';

// ============================================================================
// Configuration
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Gets the master encryption key from environment
 *
 * In production, this should come from a KMS (AWS KMS, GCP KMS, etc.)
 */
function getMasterKey(): Buffer {
  const key = env.encryption?.masterKey || process.env.ENCRYPTION_MASTER_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY not configured. Set environment variable.'
    );
  }

  // Key should be base64-encoded
  return Buffer.from(key, 'base64');
}

// ============================================================================
// Envelope Encryption
// ============================================================================

/**
 * Encrypted data envelope structure
 */
export interface EncryptedEnvelope {
  /** Encrypted data encryption key (DEK) */
  encryptedDek: string;

  /** Initialization vector (IV) */
  iv: string;

  /** Encrypted ciphertext */
  ciphertext: string;

  /** Authentication tag */
  tag: string;

  /** Salt used for key derivation */
  salt: string;

  /** Algorithm version for forward compatibility */
  version: number;
}

/**
 * Encrypts data using envelope encryption
 *
 * Process:
 * 1. Generate random data encryption key (DEK)
 * 2. Encrypt data with DEK
 * 3. Encrypt DEK with master key
 * 4. Return encrypted DEK + encrypted data
 *
 * @param plaintext - Data to encrypt
 * @returns Encrypted envelope
 */
export function encryptEnvelope(plaintext: string): EncryptedEnvelope {
  // 1. Generate random DEK (data encryption key)
  const dek = crypto.randomBytes(KEY_LENGTH);

  // 2. Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // 3. Encrypt plaintext with DEK
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // 4. Encrypt DEK with master key
  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key from master key + salt (adds extra protection)
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');

  const dekIv = crypto.randomBytes(IV_LENGTH);
  const dekCipher = crypto.createCipheriv(ALGORITHM, derivedKey, dekIv);
  let encryptedDek = dekCipher.update(dek);
  encryptedDek = Buffer.concat([dekIv, encryptedDek, dekCipher.final(), dekCipher.getAuthTag()]);

  return {
    encryptedDek: encryptedDek.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext,
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypts data from envelope encryption
 *
 * @param envelope - Encrypted envelope
 * @returns Decrypted plaintext
 */
export function decryptEnvelope(envelope: EncryptedEnvelope): string {
  if (envelope.version !== 1) {
    throw new Error(`Unsupported envelope version: ${envelope.version}`);
  }

  // 1. Decrypt DEK with master key
  const masterKey = getMasterKey();
  const salt = Buffer.from(envelope.salt, 'base64');

  // Derive key from master key + salt
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');

  const encryptedDekBuffer = Buffer.from(envelope.encryptedDek, 'base64');

  // Extract IV, ciphertext, and tag from encrypted DEK
  const dekIv = encryptedDekBuffer.subarray(0, IV_LENGTH);
  const dekCiphertext = encryptedDekBuffer.subarray(
    IV_LENGTH,
    encryptedDekBuffer.length - TAG_LENGTH
  );
  const dekTag = encryptedDekBuffer.subarray(encryptedDekBuffer.length - TAG_LENGTH);

  const dekDecipher = crypto.createDecipheriv(ALGORITHM, derivedKey, dekIv);
  dekDecipher.setAuthTag(dekTag);

  let dek = dekDecipher.update(dekCiphertext);
  dek = Buffer.concat([dek, dekDecipher.final()]);

  // 2. Decrypt ciphertext with DEK
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(envelope.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

// ============================================================================
// JSON Serialization
// ============================================================================

/**
 * Serializes encrypted envelope to JSON string
 */
export function serializeEnvelope(envelope: EncryptedEnvelope): string {
  return JSON.stringify(envelope);
}

/**
 * Deserializes encrypted envelope from JSON string
 */
export function deserializeEnvelope(json: string): EncryptedEnvelope {
  return JSON.parse(json);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generates a random API key
 */
export function generateApiKey(prefix: string = 'sk'): string {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hashes a value for comparison (e.g., API key verification)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('base64');
}

/**
 * Securely compares two strings (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
