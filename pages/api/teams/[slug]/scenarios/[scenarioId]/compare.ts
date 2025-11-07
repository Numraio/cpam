/**
 * API: Compare Scenarios
 *
 * POST /api/teams/:slug/scenarios/:scenarioId/compare - Compare scenarios or against baseline
 * GET /api/teams/:slug/scenarios/:scenarioId/compare - Export comparison as CSV
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getScenario } from '@/lib/scenarios/scenario-service';
import {
  compareScenarios,
  compareScenarioToBaseline,
  exportComparisonToCSV,
} from '@/lib/scenarios/scenario-comparison';

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
    case 'POST':
      return handleCompare(req, res, scenarioId as string);
    case 'GET':
      return handleExportCSV(req, res, scenarioId as string);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Compare scenarios
 */
async function handleCompare(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    const { compareToScenarioId, compareToBaselineId } = req.body;

    let comparison;

    if (compareToScenarioId) {
      // Compare two scenarios
      comparison = await compareScenarios(scenarioId, compareToScenarioId);
    } else if (compareToBaselineId) {
      // Compare scenario to baseline batch
      comparison = await compareScenarioToBaseline(
        scenarioId,
        compareToBaselineId
      );
    } else {
      return res.status(400).json({
        error: 'compareToScenarioId or compareToBaselineId is required',
      });
    }

    return res.status(200).json({ comparison });
  } catch (error: any) {
    console.error('Failed to compare scenarios:', error);
    return res.status(500).json({
      error: 'Failed to compare scenarios',
      message: error.message,
    });
  }
}

/**
 * Export comparison as CSV
 */
async function handleExportCSV(
  req: NextApiRequest,
  res: NextApiResponse,
  scenarioId: string
) {
  try {
    const { compareToScenarioId, compareToBaselineId } = req.query;

    let comparison;

    if (compareToScenarioId) {
      comparison = await compareScenarios(
        scenarioId,
        compareToScenarioId as string
      );
    } else if (compareToBaselineId) {
      comparison = await compareScenarioToBaseline(
        scenarioId,
        compareToBaselineId as string
      );
    } else {
      return res.status(400).json({
        error: 'compareToScenarioId or compareToBaselineId is required',
      });
    }

    const csv = exportComparisonToCSV(comparison);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scenario-comparison-${scenarioId}.csv"`
    );

    return res.status(200).send(csv);
  } catch (error: any) {
    console.error('Failed to export comparison:', error);
    return res.status(500).json({
      error: 'Failed to export comparison',
      message: error.message,
    });
  }
}
