/**
 * API: Individual Provider Credential
 *
 * GET /api/provider-credentials/[id] - Get credential metadata (without secrets)
 * PATCH /api/provider-credentials/[id] - Update credential metadata
 * DELETE /api/provider-credentials/[id] - Delete credential
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireOwnerAccess } from '@/lib/authz';

interface UpdateCredentialRequest {
  name?: string;
  description?: string;
  expiresAt?: string | null;
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
  // Only owners can manage credentials
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

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, credential);
    case 'PATCH':
      return handleUpdate(req, res, id, tenantId);
    case 'DELETE':
      return handleDelete(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get credential metadata (without secrets)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  credential: any
) {
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

  return res.status(200).json(response);
}

/**
 * Update credential metadata
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  tenantId: string
) {
  try {
    const body = req.body as UpdateCredentialRequest;

    // Check for name uniqueness if name is being updated
    if (body.name) {
      const existing = await prisma.providerCredential.findFirst({
        where: {
          tenantId,
          name: body.name,
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: `Credential with name "${body.name}" already exists`,
        });
      }
    }

    const updated = await prisma.providerCredential.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.expiresAt !== undefined && {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        }),
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
    console.error('Error updating credential:', error);
    return res.status(500).json({
      error: 'Failed to update credential',
      message: error.message,
    });
  }
}

/**
 * Delete credential
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    await prisma.providerCredential.delete({
      where: { id },
    });

    return res.status(204).end();
  } catch (error: any) {
    console.error('Error deleting credential:', error);
    return res.status(500).json({
      error: 'Failed to delete credential',
      message: error.message,
    });
  }
}
