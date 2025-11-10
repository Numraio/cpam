/**
 * API: Calculations (CRUD)
 *
 * POST /api/teams/:slug/calculations - Create/start calculation
 * GET /api/teams/:slug/calculations - List calculations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.query;

  // Get team
  const team = await prisma.team.findUnique({
    where: { slug: slug as string },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tenantId = team.id;

  switch (req.method) {
    case 'POST':
      return handleCreate(req, res, tenantId);
    case 'GET':
      return handleList(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Create/start new calculation
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { pamId, contractId, scenarioId, inputsHash, metadata } = req.body;

    // Validate required fields
    if (!pamId) {
      return res.status(400).json({ error: 'pamId is required' });
    }

    // Create calculation batch
    const calcBatch = await prisma.calcBatch.create({
      data: {
        tenantId,
        pamId,
        contractId: contractId || null,
        scenarioId: scenarioId || null,
        inputsHash: inputsHash || `hash-${Date.now()}`, // Generate hash if not provided
        status: 'QUEUED',
        metadata: metadata || {},
      },
    });

    // TODO: Queue the calculation job for async processing
    // await queueCalculation(calcBatch.id);

    return res.status(201).json({
      calculation: calcBatch,
    });
  } catch (error: any) {
    console.error('Failed to create calculation:', error);
    return res.status(500).json({
      error: 'Failed to create calculation',
      message: error.message,
    });
  }
}

/**
 * List calculations for tenant
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const calculations = await prisma.calcBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 calculations
    });

    return res.status(200).json({ calculations });
  } catch (error: any) {
    console.error('Failed to list calculations:', error);
    return res.status(500).json({
      error: 'Failed to list calculations',
      message: error.message,
    });
  }
}
