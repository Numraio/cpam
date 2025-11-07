/**
 * OpenTelemetry Tracer
 *
 * Provides distributed tracing for critical operations.
 */

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import type { Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('cpam', '1.0.0');

export interface TraceOptions {
  attributes?: Attributes;
  kind?: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
}

/**
 * Start a new span and execute function within it
 */
export async function traced<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  options?: TraceOptions
): Promise<T> {
  const span = tracer.startSpan(spanName, {
    attributes: options?.attributes,
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () =>
      fn(span)
    );
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error: any) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Get current active span
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Attributes): void {
  const span = getCurrentSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Attributes): void {
  const span = getCurrentSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Record exception in current span
 */
export function recordSpanException(error: Error): void {
  const span = getCurrentSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Trace calculation batch execution
 */
export async function traceCalculation<T>(
  batchId: string,
  tenantId: string,
  pamId: string,
  fn: () => Promise<T>
): Promise<T> {
  return traced(
    'calculation.execute',
    async (span) => {
      span.setAttributes({
        'calc.batch_id': batchId,
        'calc.tenant_id': tenantId,
        'calc.pam_id': pamId,
      });

      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      span.setAttributes({
        'calc.duration_ms': duration,
      });

      return result;
    }
  );
}

/**
 * Trace ingestion operation
 */
export async function traceIngestion<T>(
  tenantId: string,
  provider: string,
  seriesCodes: string[],
  fn: () => Promise<T>
): Promise<T> {
  return traced(
    'ingestion.execute',
    async (span) => {
      span.setAttributes({
        'ingestion.tenant_id': tenantId,
        'ingestion.provider': provider,
        'ingestion.series_count': seriesCodes.length,
        'ingestion.series_codes': seriesCodes.join(','),
      });

      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      span.setAttributes({
        'ingestion.duration_ms': duration,
      });

      return result;
    }
  );
}

/**
 * Trace API request
 */
export async function traceAPIRequest<T>(
  method: string,
  path: string,
  tenantId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return traced(
    `api.${method.toLowerCase()}.${path}`,
    async (span) => {
      span.setAttributes({
        'http.method': method,
        'http.path': path,
        ...(tenantId && { 'tenant.id': tenantId }),
      });

      const result = await fn();

      return result;
    }
  );
}

/**
 * Trace database query
 */
export async function traceQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return traced(
    `db.${operation}`,
    async (span) => {
      span.setAttributes({
        'db.operation': operation,
        'db.table': table,
      });

      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      span.setAttributes({
        'db.duration_ms': duration,
      });

      return result;
    }
  );
}
