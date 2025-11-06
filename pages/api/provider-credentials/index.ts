/**
 * API: Provider Credentials
 *
 * POST /api/provider-credentials - Create a new credential (owner only)
 * GET /api/provider-credentials - List credentials (owner only, without secrets)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireOwnerAccess } from '@/lib/authz';
import {
  encryptEnvelope,
  serializeEnvelope,
  type EncryptedEnvelope,
} from '@/lib/crypto/encryption';

interface CreateCredentialRequest {
  provider: string;
  name: string;
  description?: string;
  credentials: Record<string, string>; // e.g., { apiKey: "...", secret: "..." }
  expiresAt?: string; // ISO date string
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
  // NEVER include encryptedData or decrypted credentials in response
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only owners can manage credentials
  const session = await requireOwnerAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;

  switch (req.method) {
    case 'POST':
      return handleCreate(req, res, tenantId, session.user.id);
    case 'GET':
      return handleList(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Create a new credential
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  userId: string
) {
  try {
    const body = req.body as CreateCredentialRequest;

    // Validate required fields
    if (!body.provider || !body.name || !body.credentials) {
      return res.status(400).json({
        error: 'Missing required fields: provider, name, credentials',
      });
    }

    // Check for duplicate
    const existing = await prisma.providerCredential.findUnique({
      where: {
        tenantId_provider_name: {
          tenantId,
          provider: body.provider,
          name: body.name,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: `Credential with provider "${body.provider}" and name "${body.name}" already exists`,
      });
    }

    // Encrypt the credentials using envelope encryption
    const plaintext = JSON.stringify(body.credentials);
    const envelope: EncryptedEnvelope = encryptEnvelope(plaintext);
    const encryptedData = serializeEnvelope(envelope);

    // Create credential
    const credential = await prisma.providerCredential.create({
      data: {
        tenantId,
        provider: body.provider,
        name: body.name,
        description: body.description,
        encryptedData,
        createdBy: userId,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    // Return credential WITHOUT encrypted data
    const response: CredentialResponse = {
      id: credential.id,
      tenantId: credential.tenantId,
      provider: credential.provider,
      name: credential.name,
      description: credential.description ?? undefined,
      createdBy: credential.createdBy,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
      lastUsedAt: credential.lastUsedAt?.toISOString(),
      lastRotatedAt: credential.lastRotatedAt?.toISOString(),
      expiresAt: credential.expiresAt?.toISOString(),
    };

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating credential:', error);
    return res.status(500).json({
      error: 'Failed to create credential',
      message: error.message,
    });
  }
}

/**
 * List credentials (without secrets)
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { provider } = req.query;

    const credentials = await prisma.providerCredential.findMany({
      where: {
        tenantId,
        ...(provider && typeof provider === 'string' ? { provider } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return WITHOUT encrypted data
    const response: CredentialResponse[] = credentials.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      provider: c.provider,
      name: c.name,
      description: c.description ?? undefined,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastUsedAt: c.lastUsedAt?.toISOString(),
      lastRotatedAt: c.lastRotatedAt?.toISOString(),
      expiresAt: c.expiresAt?.toISOString(),
    }));

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error listing credentials:', error);
    return res.status(500).json({
      error: 'Failed to list credentials',
      message: error.message,
    });
  }
}
