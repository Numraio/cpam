/**
 * Ingestion Scheduler
 *
 * Cron-based scheduler with jitter for daily data ingestion
 */

import { adapterRegistry } from './adapter-interface';
import { OANDAAdapter } from './adapters/oanda-adapter';
import { runBulkIngestion, ensureSeriesExists } from './ingestion-service';
import { enqueueIngestion } from '@/lib/queue/queue';

// ============================================================================
// Configuration
// ============================================================================

const JITTER_MAX_MS = 5 * 60 * 1000; // 5 minutes of jitter

// ============================================================================
// Scheduler Setup
// ============================================================================

/**
 * Initializes the ingestion scheduler
 */
export function initializeScheduler() {
  // Register adapters
  const oandaAdapter = new OANDAAdapter();
  adapterRegistry.register(oandaAdapter);

  console.log('Ingestion scheduler initialized');
  console.log('Registered adapters:', adapterRegistry.list());
}

/**
 * Schedules daily ingestion for a tenant
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name (e.g., "OANDA")
 * @param seriesCodes - Series codes to fetch
 * @param cronSchedule - Cron schedule (default: "0 1 * * *" = 1 AM daily)
 */
export async function scheduleDailyIngestion(
  tenantId: string,
  provider: string,
  seriesCodes: string[],
  cronSchedule: string = '0 1 * * *' // 1 AM daily
): Promise<void> {
  // Ensure series exist
  for (const seriesCode of seriesCodes) {
    await ensureSeriesExists(tenantId, seriesCode, provider);
  }

  // Enqueue ingestion job with cron schedule
  const jitter = Math.floor(Math.random() * JITTER_MAX_MS);

  await enqueueIngestion(
    {
      tenantId,
      provider,
      seriesCodes,
      // Fetch yesterday's data (most recent complete day)
      startDate: getYesterday(),
      endDate: getYesterday(),
      force: false,
    },
    {
      delay: jitter,
      repeat: {
        pattern: cronSchedule,
      },
    }
  );

  console.log(
    `Scheduled daily ingestion for tenant ${tenantId}, provider ${provider}, jitter ${jitter}ms`
  );
}

/**
 * Triggers manual ingestion immediately
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name
 * @param seriesCodes - Series codes to fetch
 * @param startDate - Start date
 * @param endDate - End date
 * @param force - Force refetch
 */
export async function triggerManualIngestion(
  tenantId: string,
  provider: string,
  seriesCodes: string[],
  startDate: Date,
  endDate: Date,
  force: boolean = false
): Promise<void> {
  // Ensure series exist
  for (const seriesCode of seriesCodes) {
    await ensureSeriesExists(tenantId, seriesCode, provider);
  }

  // Enqueue ingestion job immediately
  await enqueueIngestion({
    tenantId,
    provider,
    seriesCodes,
    startDate,
    endDate,
    force,
  });

  console.log(`Triggered manual ingestion for tenant ${tenantId}, provider ${provider}`);
}

/**
 * Cancels scheduled ingestion for a tenant
 *
 * @param tenantId - Tenant ID
 * @param provider - Provider name
 */
export async function cancelScheduledIngestion(
  tenantId: string,
  provider: string
): Promise<void> {
  // TODO: Implement cancellation via BullMQ
  // This would require tracking job IDs per tenant+provider
  console.log(`Cancelled scheduled ingestion for tenant ${tenantId}, provider ${provider}`);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Gets yesterday's date (UTC)
 */
function getYesterday(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Generates random jitter in milliseconds
 *
 * @param maxMs - Maximum jitter in milliseconds
 * @returns Random jitter value
 */
export function generateJitter(maxMs: number = JITTER_MAX_MS): number {
  return Math.floor(Math.random() * maxMs);
}

/**
 * Gets next run time with jitter
 *
 * @param baseTime - Base time
 * @param jitterMs - Jitter in milliseconds
 * @returns Next run time
 */
export function getNextRunTime(baseTime: Date, jitterMs: number): Date {
  return new Date(baseTime.getTime() + jitterMs);
}
