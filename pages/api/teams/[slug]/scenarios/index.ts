/**
 * API: Scenarios (List/Create)
 *
 * GET /api/teams/:slug/scenarios - List scenarios
 * POST /api/teams/:slug/scenarios - Create scenario
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  createScenario,
  listScenarios,
  type CreateScenarioRequest,
} from '@/lib/scenarios/scenario-service';

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
    case 'GET':
      return handleList(req, res, tenantId);
    case 'POST':
      return handleCreate(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * List scenarios
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { pamId } = req.query;

    const scenarios = await listScenarios(
      tenantId,
      pamId as string | undefined
    );

    return res.status(200).json({ scenarios });
  } catch (error: any) {
    console.error('Failed to list scenarios:', error);
    return res.status(500).json({
      error: 'Failed to list scenarios',
      message: error.message,
    });
  }
}

/**
 * Create scenario
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  userId: string
) {
  try {
    const { name, description, pamId, baselineId, overrides } = req.body;

    if (!name || !pamId) {
      return res.status(400).json({ error: 'name and pamId are required' });
    }

    const request: CreateScenarioRequest = {
      tenantId,
      name,
      description,
      pamId,
      baselineId,
      overrides,
      createdBy: userId,
    };

    const scenario = await createScenario(request);

    return res.status(201).json({ scenario });
  } catch (error: any) {
    console.error('Failed to create scenario:', error);
    return res.status(500).json({
      error: 'Failed to create scenario',
      message: error.message,
    });
  }
}
