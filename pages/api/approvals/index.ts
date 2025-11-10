/**
 * API: Approvals (List)
 *
 * GET /api/approvals - List approval events
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
      return res.status(200).json({ approvals: [] });
    }

    const tenantId = teams[0].team.id;
    const status = req.query.status as string;

    // Build where clause
    const where: any = { tenantId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Get approvals
    const approvals = await prisma.approvalEvent.findMany({
      where,
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({ approvals });
  } catch (error: any) {
    console.error('Failed to list approvals:', error);
    return res.status(500).json({
      error: 'Failed to list approvals',
      message: error.message,
    });
  }
}
