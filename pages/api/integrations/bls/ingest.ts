import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import {
  ingestBLSData,
  backfillBLSData,
  getBLSIngestionStatus,
} from '@/lib/integrations/bls/ingestion-service';

/**
 * POST /api/integrations/bls/ingest
 * Trigger BLS data ingestion for a specific IndexSeries
 *
 * Body: {
 *   indexSeriesId: string;
 *   action: 'ingest' | 'backfill' | 'status';
 *   yearsBack?: number; // For backfill
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { indexSeriesId, action = 'ingest', yearsBack = 2 } = req.body;

    if (!indexSeriesId) {
      return res.status(400).json({ error: 'indexSeriesId is required' });
    }

    // Get IndexSeries and verify access
    const indexSeries = await prisma.indexSeries.findUnique({
      where: { id: indexSeriesId },
      include: {
        tenant: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!indexSeries) {
      return res.status(404).json({ error: 'IndexSeries not found' });
    }

    // Verify user is member of tenant
    if (indexSeries.tenant.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify provider is BLS
    if (indexSeries.provider !== 'BLS') {
      return res.status(400).json({
        error: `IndexSeries provider is ${indexSeries.provider}, not BLS`,
      });
    }

    // Extract BLS series ID from seriesCode
    const blsSeriesId = indexSeries.seriesCode.startsWith('BLS_')
      ? indexSeries.seriesCode.substring(4)
      : indexSeries.seriesCode;

    // Handle action
    switch (action) {
      case 'status': {
        const status = await getBLSIngestionStatus(indexSeriesId);
        return res.status(200).json({ data: status });
      }

      case 'ingest': {
        const result = await ingestBLSData(
          indexSeriesId,
          blsSeriesId,
          indexSeries.tenantId,
          { yearsBack: 1, force: false }
        );

        if (!result.success) {
          return res.status(500).json({
            error: result.error || 'Ingestion failed',
          });
        }

        return res.status(200).json({ data: result });
      }

      case 'backfill': {
        const result = await backfillBLSData(
          indexSeriesId,
          blsSeriesId,
          indexSeries.tenantId,
          yearsBack
        );

        if (!result.success) {
          return res.status(500).json({
            error: result.error || 'Backfill failed',
          });
        }

        return res.status(200).json({ data: result });
      }

      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: ingest, backfill, status`,
        });
    }
  } catch (error) {
    console.error('BLS ingestion API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
