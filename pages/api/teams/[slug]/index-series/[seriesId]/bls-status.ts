import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { getBLSIngestionStatus } from '@/lib/integrations/bls/ingestion-service';

/**
 * GET /api/teams/:slug/index-series/:seriesId/bls-status
 * Get BLS ingestion status for an IndexSeries
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slug, seriesId } = req.query;

    if (!slug || !seriesId || typeof slug !== 'string' || typeof seriesId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    // Get team and verify user is member
    const team = await prisma.team.findUnique({
      where: { slug },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!team || team.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get IndexSeries and verify it belongs to this team
    const indexSeries = await prisma.indexSeries.findUnique({
      where: { id: seriesId },
    });

    if (!indexSeries) {
      return res.status(404).json({ error: 'IndexSeries not found' });
    }

    if (indexSeries.tenantId !== team.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify provider is BLS
    if (indexSeries.provider !== 'BLS') {
      return res.status(400).json({
        error: `IndexSeries provider is ${indexSeries.provider}, not BLS`,
      });
    }

    // Get ingestion status
    const status = await getBLSIngestionStatus(seriesId);

    return res.status(200).json({ data: status });
  } catch (error) {
    console.error('BLS status API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
