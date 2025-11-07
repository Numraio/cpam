/**
 * API: Single Scenario (Get/Update/Delete)
 *
 * GET /api/teams/:slug/scenarios/:scenarioId - Get scenario
 * PATCH /api/teams/:slug/scenarios/:scenarioId - Update scenario
 * DELETE /api/teams/:slug/scenarios/:scenarioId - Delete scenario
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  getScenario,
  updateScenario,
  deleteScenario,
  type UpdateScenarioRequest,
} from '@/lib/scenarios/scenario-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, scenarioId } = req.query;

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

  // Verify scenario belongs to tenant
  const scenario = await getScenario(scenarioId as string);
  if (!scenario || scenario.tenantId !== tenantId) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, scenarioId as string);
    case 'PATCH':
      return handleUpdate(req, res, scenarioId as string);
    case 'DELETE':
      return handleDelete(req, res, scenarioId as string);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get scenario
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    const scenario = await getScenario(scenarioId);
    return res.status(200).json({ scenario });
  } catch (error: any) {
    console.error('Failed to get scenario:', error);
    return res.status(500).json({
      error: 'Failed to get scenario',
      message: error.message,
    });
  }
}

/**
 * Update scenario
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    const { name, description, overrides } = req.body;

    const request: UpdateScenarioRequest = {
      name,
      description,
      overrides,
    };

    const scenario = await updateScenario(scenarioId, request);

    return res.status(200).json({ scenario });
  } catch (error: any) {
    console.error('Failed to update scenario:', error);
    return res.status(500).json({
      error: 'Failed to update scenario',
      message: error.message,
    });
  }
}

/**
 * Delete scenario
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    await deleteScenario(scenarioId);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete scenario:', error);
    return res.status(500).json({
      error: 'Failed to delete scenario',
      message: error.message,
    });
  }
}
