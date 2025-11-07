/**
 * API: Usage & Entitlements
 *
 * GET /api/teams/:slug/usage - Get current usage and entitlements
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getTeamUsage, getTeamEntitlements } from '@/lib/billing/usage-service';

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

  return handleGetUsage(req, res, team.id);
}

/**
 * Get usage and entitlements
 */
async function handleGetUsage(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const [usage, entitlements] = await Promise.all([
      getTeamUsage(tenantId),
      getTeamEntitlements(tenantId),
    ]);

    const limit = entitlements.maxItemsUnderManagement;
    const current = usage.itemsUnderManagement;

    // Calculate percentage used
    const percentageUsed =
      limit !== null ? Math.round((current / limit) * 100) : 0;

    // Determine warning level
    let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (limit !== null) {
      if (current >= limit) {
        warningLevel = 'critical';
      } else if (percentageUsed >= 90) {
        warningLevel = 'high';
      } else if (percentageUsed >= 75) {
        warningLevel = 'medium';
      } else if (percentageUsed >= 50) {
        warningLevel = 'low';
      }
    }

    return res.status(200).json({
      usage: {
        itemsUnderManagement: current,
        lastUpdated: usage.lastUpdated,
      },
      entitlements: {
        maxItemsUnderManagement: limit,
        planName: entitlements.planName,
        active: entitlements.active,
      },
      metrics: {
        percentageUsed,
        warningLevel,
        remaining: limit !== null ? Math.max(0, limit - current) : null,
        canAddMore: limit === null || current < limit,
      },
    });
  } catch (error: any) {
    console.error('Failed to get usage:', error);
    return res.status(500).json({
      error: 'Failed to get usage',
      message: error.message,
    });
  }
}
