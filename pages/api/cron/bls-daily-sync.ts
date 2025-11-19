/**
 * Cron Job: Daily BLS Data Sync
 *
 * Automatically syncs all BLS IndexSeries daily to fetch latest data
 * Should be triggered by a cron service (Vercel Cron, node-cron, etc.)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ingestBLSData } from '@/lib/integrations/bls/ingestion-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is a cron request (add auth token in production)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'dev-secret';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all BLS IndexSeries from all tenants
    const blsSeries = await prisma.indexSeries.findMany({
      where: {
        provider: 'BLS',
      },
      select: {
        id: true,
        seriesCode: true,
        tenantId: true,
      },
    });

    console.log(`[CRON] Starting daily BLS sync for ${blsSeries.length} series`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Sync each series
    for (const series of blsSeries) {
      try {
        // Extract BLS series ID from seriesCode
        const blsSeriesId = series.seriesCode.startsWith('BLS_')
          ? series.seriesCode.substring(4)
          : series.seriesCode;

        // Ingest latest data (last 1 year to ensure we don't miss recent updates)
        const result = await ingestBLSData(
          series.id,
          blsSeriesId,
          series.tenantId,
          {
            yearsBack: 1, // Only fetch last year for daily updates
            force: false, // Skip existing values
            includeCatalog: false, // No need for catalog on daily sync
          }
        );

        if (result.success) {
          successCount++;
          console.log(
            `[CRON] ✓ Synced ${blsSeriesId}: ${result.valuesIngested} new, ${result.valuesSkipped} skipped`
          );
        } else {
          errorCount++;
          console.error(`[CRON] ✗ Failed ${blsSeriesId}: ${result.error}`);
        }

        results.push({
          seriesCode: series.seriesCode,
          success: result.success,
          valuesIngested: result.valuesIngested,
          valuesSkipped: result.valuesSkipped,
          error: result.error,
        });
      } catch (error) {
        errorCount++;
        console.error(`[CRON] ✗ Error syncing ${series.seriesCode}:`, error);
        results.push({
          seriesCode: series.seriesCode,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[CRON] Daily BLS sync completed: ${successCount} success, ${errorCount} errors`
    );

    return res.status(200).json({
      success: true,
      totalSeries: blsSeries.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('[CRON] Daily BLS sync failed:', error);
    return res.status(500).json({
      error: 'Daily sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
