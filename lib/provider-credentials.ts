/**
 * Provider Credential Utilities
 *
 * Internal functions for retrieving and decrypting provider credentials.
 * NEVER expose decrypted credentials via API responses.
 */

import { prisma } from '@/lib/prisma';
import {
  decryptEnvelope,
  deserializeEnvelope,
  type EncryptedEnvelope,
} from '@/lib/crypto/encryption';

/**
 * Retrieves and decrypts a provider credential
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name (e.g., "PLATTS", "OANDA")
 * @param name - Credential name
 * @returns Decrypted credential object
 */
export async function getProviderCredential(
  tenantId: string,
  provider: string,
  name: string
): Promise<Record<string, string> | null> {
  const credential = await prisma.providerCredential.findUnique({
    where: {
      tenantId_provider_name: {
        tenantId,
        provider,
        name,
      },
    },
  });

  if (!credential) {
    return null;
  }

  // Check if credential is expired
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    throw new Error(`Credential "${name}" for provider "${provider}" has expired`);
  }

  // Decrypt credential
  const envelope: EncryptedEnvelope = deserializeEnvelope(credential.encryptedData);
  const plaintext = decryptEnvelope(envelope);
  const credentials = JSON.parse(plaintext) as Record<string, string>;

  // Update last used timestamp (fire and forget)
  prisma.providerCredential
    .update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      console.error('Failed to update lastUsedAt:', error);
    });

  return credentials;
}

/**
 * Retrieves and decrypts a provider credential by ID
 *
 * @param tenantId - Tenant ID
 * @param credentialId - Credential ID
 * @returns Decrypted credential object
 */
export async function getProviderCredentialById(
  tenantId: string,
  credentialId: string
): Promise<Record<string, string> | null> {
  const credential = await prisma.providerCredential.findUnique({
    where: { id: credentialId },
  });

  if (!credential || credential.tenantId !== tenantId) {
    return null;
  }

  // Check if credential is expired
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    throw new Error(`Credential has expired`);
  }

  // Decrypt credential
  const envelope: EncryptedEnvelope = deserializeEnvelope(credential.encryptedData);
  const plaintext = decryptEnvelope(envelope);
  const credentials = JSON.parse(plaintext) as Record<string, string>;

  // Update last used timestamp (fire and forget)
  prisma.providerCredential
    .update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      console.error('Failed to update lastUsedAt:', error);
    });

  return credentials;
}

/**
 * Lists all credentials for a provider (metadata only, no secrets)
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name
 * @returns Array of credential metadata
 */
export async function listProviderCredentials(tenantId: string, provider: string) {
  return prisma.providerCredential.findMany({
    where: {
      tenantId,
      provider,
    },
    select: {
      id: true,
      provider: true,
      name: true,
      description: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      lastUsedAt: true,
      lastRotatedAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Checks if a credential is expired
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name
 * @param name - Credential name
 * @returns True if expired, false otherwise
 */
export async function isCredentialExpired(
  tenantId: string,
  provider: string,
  name: string
): Promise<boolean> {
  const credential = await prisma.providerCredential.findUnique({
    where: {
      tenantId_provider_name: {
        tenantId,
        provider,
        name,
      },
    },
    select: {
      expiresAt: true,
    },
  });

  if (!credential) {
    throw new Error(`Credential "${name}" for provider "${provider}" not found`);
  }

  return credential.expiresAt ? credential.expiresAt < new Date() : false;
}
