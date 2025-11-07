/**
 * API: Execute Scenario
 *
 * POST /api/teams/:slug/scenarios/:scenarioId/execute - Execute scenario calculation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getScenario } from '@/lib/scenarios/scenario-service';
import {
  executeScenario,
  type ExecuteScenarioRequest,
} from '@/lib/scenarios/scenario-execution';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  return handleExecute(req, res, scenarioId as string);
}

/**
 * Execute scenario
 */
async function handleExecute(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    const { asOfDate, versionPreference, itemIds } = req.body;

    if (!asOfDate) {
      return res.status(400).json({ error: 'asOfDate is required' });
    }

    const request: ExecuteScenarioRequest = {
      scenarioId,
      asOfDate: new Date(asOfDate),
      versionPreference,
      itemIds,
    };

    const result = await executeScenario(request);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Failed to execute scenario:', error);
    return res.status(500).json({
      error: 'Failed to execute scenario',
      message: error.message,
    });
  }
}
