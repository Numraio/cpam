/**
 * API: Rotate Provider Credential
 *
 * POST /api/provider-credentials/[id]/rotate - Rotate credential with new secrets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireOwnerAccess } from '@/lib/authz';
import {
  encryptEnvelope,
  serializeEnvelope,
  type EncryptedEnvelope,
} from '@/lib/crypto/encryption';

interface RotateCredentialRequest {
  credentials: Record<string, string>; // New credential values
}

interface CredentialResponse {
  id: string;
  tenantId: string;
  provider: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  lastRotatedAt?: string;
  expiresAt?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only owners can rotate credentials
  const session = await requireOwnerAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid credential ID' });
  }

  // Verify credential belongs to tenant
  const credential = await prisma.providerCredential.findUnique({
    where: { id },
  });

  if (!credential) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  if (credential.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return handleRotate(req, res, id);
}

/**
 * Rotate credential with new secrets
 */
async function handleRotate(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const body = req.body as RotateCredentialRequest;

    if (!body.credentials) {
      return res.status(400).json({
        error: 'Missing required field: credentials',
      });
    }

    // Encrypt new credentials
    const plaintext = JSON.stringify(body.credentials);
    const envelope: EncryptedEnvelope = encryptEnvelope(plaintext);
    const encryptedData = serializeEnvelope(envelope);

    // Update credential with new encrypted data and rotation timestamp
    const updated = await prisma.providerCredential.update({
      where: { id },
      data: {
        encryptedData,
        lastRotatedAt: new Date(),
      },
    });

    const response: CredentialResponse = {
      id: updated.id,
      tenantId: updated.tenantId,
      provider: updated.provider,
      name: updated.name,
      description: updated.description ?? undefined,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastUsedAt: updated.lastUsedAt?.toISOString(),
      lastRotatedAt: updated.lastRotatedAt?.toISOString(),
      expiresAt: updated.expiresAt?.toISOString(),
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error rotating credential:', error);
    return res.status(500).json({
      error: 'Failed to rotate credential',
      message: error.message,
    });
  }
}
