/**
 * Webhook Event Schemas (v1)
 *
 * Defines event types and payloads for webhook notifications
 */

// ============================================================================
// Event Types
// ============================================================================

export type WebhookEventType =
  | 'ingestion.completed'
  | 'calc.batch.completed'
  | 'calc.batch.approved'
  | 'calc.batch.rejected';

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Base event structure
 */
export interface BaseWebhookEvent<T = unknown> {
  /** Event version (currently "v1") */
  version: 'v1';

  /** Event type */
  type: WebhookEventType;

  /** Unique event ID (idempotency key) */
  eventId: string;

  /** ISO timestamp */
  timestamp: string;

  /** Tenant ID */
  tenantId: string;

  /** Event-specific data */
  data: T;
}

/**
 * Ingestion completed event
 *
 * Fired when index data ingestion completes
 */
export interface IngestionCompletedEvent extends BaseWebhookEvent<{
  ingestionId: string;
  seriesCode: string;
  asOfDate: string;
  versionTag: 'prelim' | 'final' | 'revised';
  recordCount: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}> {
  type: 'ingestion.completed';
}

/**
 * Calc batch completed event
 *
 * Fired when a calculation batch completes (success or failure)
 */
export interface CalcBatchCompletedEvent extends BaseWebhookEvent<{
  batchId: string;
  pamId: string;
  pamName: string;
  asOfDate: string;
  status: 'COMPLETED' | 'FAILED';
  itemCount: number;
  errorCount?: number;
  errorMessage?: string;
  executionTimeMs: number;
}> {
  type: 'calc.batch.completed';
}

/**
 * Calc batch approved event
 *
 * Fired when a batch is approved by a user
 */
export interface CalcBatchApprovedEvent extends BaseWebhookEvent<{
  batchId: string;
  pamId: string;
  pamName: string;
  asOfDate: string;
  approvedBy: string;
  approvedAt: string;
  itemCount: number;
  overrideCount: number;
}> {
  type: 'calc.batch.approved';
}

/**
 * Calc batch rejected event
 *
 * Fired when a batch is rejected by a user
 */
export interface CalcBatchRejectedEvent extends BaseWebhookEvent<{
  batchId: string;
  pamId: string;
  pamName: string;
  asOfDate: string;
  rejectedBy: string;
  rejectedAt: string;
  reason?: string;
}> {
  type: 'calc.batch.rejected';
}

/**
 * Union of all webhook events
 */
export type WebhookEvent =
  | IngestionCompletedEvent
  | CalcBatchCompletedEvent
  | CalcBatchApprovedEvent
  | CalcBatchRejectedEvent;

// ============================================================================
// Event Builders
// ============================================================================

/**
 * Creates a unique event ID for idempotency
 */
export function createEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Builds an ingestion completed event
 */
export function buildIngestionCompletedEvent(
  tenantId: string,
  data: IngestionCompletedEvent['data']
): IngestionCompletedEvent {
  return {
    version: 'v1',
    type: 'ingestion.completed',
    eventId: createEventId(),
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };
}

/**
 * Builds a calc batch completed event
 */
export function buildCalcBatchCompletedEvent(
  tenantId: string,
  data: CalcBatchCompletedEvent['data']
): CalcBatchCompletedEvent {
  return {
    version: 'v1',
    type: 'calc.batch.completed',
    eventId: createEventId(),
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };
}

/**
 * Builds a calc batch approved event
 */
export function buildCalcBatchApprovedEvent(
  tenantId: string,
  data: CalcBatchApprovedEvent['data']
): CalcBatchApprovedEvent {
  return {
    version: 'v1',
    type: 'calc.batch.approved',
    eventId: createEventId(),
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };
}

/**
 * Builds a calc batch rejected event
 */
export function buildCalcBatchRejectedEvent(
  tenantId: string,
  data: CalcBatchRejectedEvent['data']
): CalcBatchRejectedEvent {
  return {
    version: 'v1',
    type: 'calc.batch.rejected',
    eventId: createEventId(),
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };
}
