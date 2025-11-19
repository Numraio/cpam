/**
 * API: Index Series (CRUD)
 *
 * POST /api/teams/:slug/index-series - Create index series
 * GET /api/teams/:slug/index-series - List index series
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ingestBLSData } from '@/lib/integrations/bls/ingestion-service';

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
    case 'POST':
      return handleCreate(req, res, tenantId);
    case 'GET':
      return handleList(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Create index series
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { seriesCode, name, description, provider, dataType, unit, frequency } = req.body;

    // Validate required fields
    if (!seriesCode) {
      return res.status(400).json({ error: 'seriesCode is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!provider) {
      return res.status(400).json({ error: 'provider is required' });
    }
    if (!dataType) {
      return res.status(400).json({ error: 'dataType is required' });
    }
    if (!frequency) {
      return res.status(400).json({ error: 'frequency is required' });
    }

    const indexSeries = await prisma.indexSeries.create({
      data: {
        tenantId,
        seriesCode,
        name,
        description: description || null,
        provider,
        dataType,
        unit: unit || null,
        frequency,
      },
    });

    // Auto-sync BLS data with full historical backfill
    if (provider === 'BLS') {
      // Extract BLS series ID from seriesCode (format: "BLS_CUUR0000SA0" or just "CUUR0000SA0")
      const blsSeriesId = seriesCode.startsWith('BLS_')
        ? seriesCode.substring(4)
        : seriesCode;

      // Trigger BLS ingestion in background (don't await to avoid timeout)
      ingestBLSData(indexSeries.id, blsSeriesId, tenantId, {
        yearsBack: 50, // Full historical backfill (most BLS series start in 1980s)
        force: false,
        includeCatalog: true,
      }).catch((error) => {
        console.error(`Auto-sync failed for BLS series ${blsSeriesId}:`, error);
      });
    }

    return res.status(201).json({
      indexSeries,
    });
  } catch (error: any) {
    console.error('Failed to create index series:', error);
    return res.status(500).json({
      error: 'Failed to create index series',
      message: error.message,
    });
  }
}

/**
 * List index series for tenant
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const indexSeries = await prisma.indexSeries.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ indexSeries });
  } catch (error: any) {
    console.error('Failed to list index series:', error);
    return res.status(500).json({
      error: 'Failed to list index series',
      message: error.message,
    });
  }
}
