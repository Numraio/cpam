import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllSeriesForUI } from '@/lib/integrations/bls/series-catalog';

/**
 * GET /api/integrations/bls/series
 * Get catalog of available BLS series
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const series = getAllSeriesForUI();

    return res.status(200).json({
      data: series,
      count: series.length,
    });
  } catch (error) {
    console.error('Failed to fetch BLS series catalog:', error);
    return res.status(500).json({
      error: 'Failed to fetch BLS series catalog',
    });
  }
}
