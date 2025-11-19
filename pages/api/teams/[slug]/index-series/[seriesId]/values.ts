/**
 * API: Index Series Values
 *
 * GET /api/teams/:slug/index-series/:seriesId/values - Get historical price values
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

  const { slug, seriesId } = req.query;

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
      return handleGet(req, res, tenantId, seriesId as string);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get index values for a series
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  seriesId: string
) {
  try {
    // First verify the series exists and belongs to this tenant
    const indexSeries = await prisma.indexSeries.findFirst({
      where: {
        id: seriesId,
        tenantId,
      },
    });

    if (!indexSeries) {
      return res.status(404).json({ error: 'Index series not found' });
    }

    // Parse query parameters
    const { startDate, endDate, limit, orderBy = 'date', order = 'desc' } = req.query;

    // Build where clause for date filtering
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Build Prisma query
    const where: any = {
      seriesId: seriesId,
    };

    if (Object.keys(dateFilter).length > 0) {
      where.asOfDate = dateFilter;
    }

    // Fetch values
    const values = await prisma.indexValue.findMany({
      where,
      orderBy: {
        asOfDate: order as 'asc' | 'desc',
      },
      take: limit ? parseInt(limit as string, 10) : undefined,
      select: {
        asOfDate: true,
        value: true,
        id: true,
      },
    });

    // Get total count for pagination
    const total = await prisma.indexValue.count({ where });

    return res.status(200).json({
      values: values.map((v) => ({
        id: v.id,
        date: v.asOfDate.toISOString(),
        value: parseFloat(v.value.toString()),
      })),
      total,
    });
  } catch (error: any) {
    console.error('Failed to fetch index values:', error);
    return res.status(500).json({
      error: 'Failed to fetch index values',
      message: error.message,
    });
  }
}
