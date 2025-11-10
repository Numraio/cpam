/**
 * API: Dashboard Activity Feed
 *
 * GET /api/dashboard/activity - Get recent activity
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
      return res.status(200).json({ activity: [] });
    }

    const tenantId = teams[0].team.id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent calculations
    const recentCalcs = await prisma.calcBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        pam: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get recent approvals
    const recentApprovals = await prisma.approvalEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        approver: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Get recently added items
    const recentItems = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        createdAt: true,
      },
    });

    // Combine and sort by date
    const activity = [
      ...recentCalcs.map((calc) => ({
        type: 'calculation' as const,
        id: calc.id,
        status: calc.status,
        timestamp: calc.createdAt,
        data: {
          pamName: calc.pam.name,
          completedAt: calc.completedAt,
        },
      })),
      ...recentApprovals.map((approval) => ({
        type: 'approval' as const,
        id: approval.id,
        status: approval.status,
        timestamp: approval.createdAt,
        data: {
          approver: approval.approver?.name || approval.approver?.email,
          approvedAt: approval.approvedAt,
        },
      })),
      ...recentItems.map((item) => ({
        type: 'item' as const,
        id: item.id,
        status: 'created' as const,
        timestamp: item.createdAt,
        data: {
          name: item.name,
          sku: item.sku,
        },
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return res.status(200).json({ activity });
  } catch (error: any) {
    console.error('Failed to get dashboard activity:', error);
    return res.status(500).json({
      error: 'Failed to get dashboard activity',
      message: error.message,
    });
  }
}
