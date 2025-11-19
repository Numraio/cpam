/**
 * API: Single Index Series (Get/Update/Delete)
 *
 * GET /api/teams/:slug/index-series/:seriesId - Get index series
 * PATCH /api/teams/:slug/index-series/:seriesId - Update index series
 * DELETE /api/teams/:slug/index-series/:seriesId - Delete index series
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
    case 'PATCH':
      return handleUpdate(req, res, tenantId, seriesId as string);
    case 'DELETE':
      return handleDelete(req, res, tenantId, seriesId as string);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get single index series
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  seriesId: string
) {
  try {
    const indexSeries = await prisma.indexSeries.findFirst({
      where: {
        id: seriesId,
        tenantId, // Ensure series belongs to tenant
      },
    });

    if (!indexSeries) {
      return res.status(404).json({ error: 'Index series not found' });
    }

    return res.status(200).json({ indexSeries });
  } catch (error: any) {
    console.error('Failed to get index series:', error);
    return res.status(500).json({
      error: 'Failed to get index series',
      message: error.message,
    });
  }
}

/**
 * Update index series
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  seriesId: string
) {
  try {
    const { name, description, provider, dataType, unit, frequency } = req.body;

    // First verify the series exists and belongs to this tenant
    const existing = await prisma.indexSeries.findFirst({
      where: {
        id: seriesId,
        tenantId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Index series not found' });
    }

    const indexSeries = await prisma.indexSeries.update({
      where: {
        id: seriesId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(provider !== undefined && { provider }),
        ...(dataType !== undefined && { dataType }),
        ...(unit !== undefined && { unit }),
        ...(frequency !== undefined && { frequency }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({ indexSeries });
  } catch (error: any) {
    console.error('Failed to update index series:', error);
    return res.status(500).json({
      error: 'Failed to update index series',
      message: error.message,
    });
  }
}

/**
 * Delete index series
 */
async function handleDelete(
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

    // Delete index series (cascade will delete all associated IndexValues)
    await prisma.indexSeries.delete({
      where: {
        id: seriesId,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete index series:', error);
    return res.status(500).json({
      error: 'Failed to delete index series',
      message: error.message,
    });
  }
}
