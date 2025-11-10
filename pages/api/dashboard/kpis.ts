/**
 * API: Dashboard KPIs
 *
 * GET /api/dashboard/kpis - Get dashboard KPI summary
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user's teams
    const teams = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      include: { team: true },
    });

    if (teams.length === 0) {
      return res.status(200).json({
        kpis: {
          totalItems: 0,
          totalExposure: 0,
          pendingApprovals: 0,
          lastCalculation: null,
          calculations: { completed: 0, running: 0, failed: 0 },
        },
      });
    }

    const tenantId = teams[0].team.id;

    // Get total items
    const totalItems = await prisma.item.count({
      where: { tenantId },
    });

    // Get pending approvals count
    const pendingApprovals = await prisma.approvalEvent.count({
      where: {
        tenantId,
        status: 'PENDING',
      },
    });

    // Get last calculation
    const lastCalc = await prisma.calcBatch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Get calculation stats
    const [completed, running, failed] = await Promise.all([
      prisma.calcBatch.count({
        where: { tenantId, status: 'COMPLETED' },
      }),
      prisma.calcBatch.count({
        where: { tenantId, status: 'RUNNING' },
      }),
      prisma.calcBatch.count({
        where: { tenantId, status: 'FAILED' },
      }),
    ]);

    // Calculate total exposure (sum of all completed calc results)
    const exposureData = await prisma.calcResult.aggregate({
      where: {
        batch: { tenantId },
        status: 'APPROVED',
      },
      _sum: {
        adjustedPrice: true,
      },
    });

    const totalExposure = exposureData._sum.adjustedPrice || 0;

    return res.status(200).json({
      kpis: {
        totalItems,
        totalExposure: Number(totalExposure),
        pendingApprovals,
        lastCalculation: lastCalc,
        calculations: {
          completed,
          running,
          failed,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get dashboard KPIs:', error);
    return res.status(500).json({
      error: 'Failed to get dashboard KPIs',
      message: error.message,
    });
  }
}
