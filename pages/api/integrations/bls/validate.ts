import type { NextApiRequest, NextApiResponse } from 'next';
import { blsClient } from '@/lib/integrations/bls/client';

/**
 * GET /api/integrations/bls/validate?seriesId=XXX
 * Validate a BLS series ID and return metadata
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { seriesId } = req.query;

  if (!seriesId || typeof seriesId !== 'string') {
    return res.status(400).json({
      valid: false,
      error: 'Series ID is required',
    });
  }

  try {
    // Fetch a small amount of data to validate the series exists
    const currentYear = new Date().getFullYear().toString();
    const series = await blsClient.fetchSingleSeries(
      seriesId,
      currentYear,
      currentYear,
      { catalog: true } // Request metadata
    );

    // Extract metadata from the series
    const metadata = {
      title: series.seriesID || seriesId,
      description: `BLS Series: ${series.seriesID}`,
      category: 'OTHER', // BLS doesn't always provide category
      frequency: 'UNKNOWN',
      seasonalAdjustment: 'UNKNOWN',
    };

    // Try to extract more info from catalog if available
    if (series.catalog) {
      // BLS catalog structure varies, but we can try to extract some info
      metadata.title = series.catalog.series_title || metadata.title;
    }

    return res.status(200).json({
      valid: true,
      seriesId: series.seriesID,
      metadata,
      dataAvailable: series.data && series.data.length > 0,
    });
  } catch (error) {
    console.error('BLS validation error:', error);

    // Check if it's a "no data found" error
    if (error instanceof Error && error.message.includes('No data found')) {
      return res.status(404).json({
        valid: false,
        error: `Series ID '${seriesId}' not found in BLS database`,
      });
    }

    return res.status(500).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate series ID',
    });
  }
}
