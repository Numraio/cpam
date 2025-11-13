/**
 * Scheduled Job: Ingest BLS Data
 * Runs daily to fetch latest BLS index data for all teams
 */

import { prisma } from '@/lib/prisma';
import { ingestAllBLSSeriesForTenant } from '@/lib/integrations/bls/ingestion-service';

export interface BLSJobResult {
  tenantsProcessed: number;
  seriesProcessed: number;
  valuesIngested: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
}

/**
 * Main job function: Ingest latest BLS data for all tenants
 */
export async function ingestBLSJob(): Promise<BLSJobResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  let tenantsProcessed = 0;
  let seriesProcessed = 0;
  let valuesIngested = 0;

  console.log('[BLS Job] Starting BLS data ingestion job...');

  try {
    // Find all tenants with at least one BLS IndexSeries
    const tenantsWithBLS = await prisma.team.findMany({
      where: {
        indexSeries: {
          some: {
            provider: 'BLS',
          },
        },
      },
      include: {
        indexSeries: {
          where: { provider: 'BLS' },
          select: { id: true, seriesCode: true, name: true },
        },
      },
    });

    console.log(`[BLS Job] Found ${tenantsWithBLS.length} tenant(s) with BLS series`);

    // Process each tenant
    for (const tenant of tenantsWithBLS) {
      console.log(`[BLS Job] Processing tenant: ${tenant.name} (${tenant.id})`);
      console.log(`[BLS Job]   - ${tenant.indexSeries.length} BLS series to process`);

      try {
        const results = await ingestAllBLSSeriesForTenant(tenant.id, {
          yearsBack: 1, // Only fetch last year for incremental updates
          force: false, // Don't overwrite existing data
        });

        for (const result of results) {
          seriesProcessed++;

          if (result.success) {
            valuesIngested += result.valuesIngested;
            console.log(
              `[BLS Job]   ✓ ${result.seriesId}: +${result.valuesIngested} values, ~${result.valuesSkipped} skipped`
            );
          } else {
            errors.push(`${tenant.name} / ${result.seriesId}: ${result.error}`);
            console.error(`[BLS Job]   ✗ ${result.seriesId}: ${result.error}`);
          }
        }

        tenantsProcessed++;
      } catch (error) {
        const errorMsg = `Tenant ${tenant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[BLS Job] Error processing tenant ${tenant.name}:`, error);
      }
    }
  } catch (error) {
    const errorMsg = `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error('[BLS Job] Fatal error:', error);
  }

  const completedAt = new Date();
  const duration = completedAt.getTime() - startedAt.getTime();

  const result: BLSJobResult = {
    tenantsProcessed,
    seriesProcessed,
    valuesIngested,
    errors,
    startedAt,
    completedAt,
    duration,
  };

  console.log('[BLS Job] Job completed:');
  console.log(`  - Tenants processed: ${tenantsProcessed}`);
  console.log(`  - Series processed: ${seriesProcessed}`);
  console.log(`  - Values ingested: ${valuesIngested}`);
  console.log(`  - Errors: ${errors.length}`);
  console.log(`  - Duration: ${(duration / 1000).toFixed(2)}s`);

  if (errors.length > 0) {
    console.error('[BLS Job] Errors occurred:');
    errors.forEach((error) => console.error(`  - ${error}`));
  }

  return result;
}

/**
 * Run job with error handling
 */
export async function runBLSJob(): Promise<void> {
  try {
    await ingestBLSJob();
  } catch (error) {
    console.error('[BLS Job] Unhandled error:', error);
    throw error;
  }
}

// If running directly (e.g., via ts-node)
if (require.main === module) {
  runBLSJob()
    .then(() => {
      console.log('[BLS Job] Completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[BLS Job] Failed:', error);
      process.exit(1);
    });
}
