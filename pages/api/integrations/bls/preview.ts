import type { NextApiRequest, NextApiResponse} from 'next';
import { blsClient } from '@/lib/integrations/bls/client';
import { parseBLSSeries, extractBLSMetadata } from '@/lib/integrations/bls/mapper';

/**
 * POST /api/integrations/bls/preview
 * Preview BLS series data before importing
 *
 * Body: {
 *   seriesId: string;
 *   yearsBack?: number; // Default: 2
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
    const { seriesId, yearsBack = 2 } = req.body;

    if (!seriesId) {
      return res.status(400).json({ error: 'seriesId is required' });
    }

    // Validate yearsBack
    const years = Math.min(Math.max(yearsBack, 1), 10); // 1-10 years

    // Fetch data from BLS
    const currentYear = new Date().getFullYear();
    const startYear = (currentYear - years).toString();
    const endYear = currentYear.toString();

    const series = await blsClient.fetchSingleSeries(
      seriesId,
      startYear,
      endYear,
      { catalog: true } // Include metadata
    );

    // Parse data
    const parsedData = parseBLSSeries(series);
    const metadata = extractBLSMetadata(series);

    // Return preview
    return res.status(200).json({
      data: {
        seriesId: series.seriesID,
        metadata,
        dataPoints: parsedData.map((dp) => ({
          date: dp.date.toISOString().split('T')[0], // YYYY-MM-DD
          value: dp.value,
          period: dp.period,
          year: dp.year,
        })),
        count: parsedData.length,
        dateRange: {
          start: parsedData[0]?.date.toISOString().split('T')[0],
          end: parsedData[parsedData.length - 1]?.date.toISOString().split('T')[0],
        },
      },
    });
  } catch (error) {
    console.error('BLS preview error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to preview BLS series',
    });
  }
}
