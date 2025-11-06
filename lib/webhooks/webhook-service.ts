/**
 * Webhook Delivery Service
 *
 * Uses Svix for signed webhook delivery with retries
 */

import { Svix } from 'svix';
import type { PrismaClient } from '@prisma/client';
import env from '../env';
import type { WebhookEvent, WebhookEventType } from './events';

// ============================================================================
// Svix Client
// ============================================================================

let svixClient: Svix | null = null;

/**
 * Gets or creates Svix client
 */
function getSvixClient(): Svix {
  if (!svixClient) {
    const apiKey = env.svix?.apiKey || process.env.SVIX_API_KEY;

    if (!apiKey) {
      throw new Error(
        'SVIX_API_KEY not configured. Set SVIX_API_KEY environment variable.'
      );
    }

    svixClient = new Svix(apiKey);
  }

  return svixClient;
}

// ============================================================================
// Webhook Delivery
// ============================================================================

export interface WebhookDeliveryOptions {
  /** Optional idempotency key (defaults to event.eventId) */
  idempotencyKey?: string;

  /** Optional channels to filter endpoints */
  channels?: string[];
}

/**
 * Delivers a webhook event to all subscribed endpoints for a tenant
 *
 * @param tenantId - Tenant ID
 * @param event - Webhook event
 * @param options - Delivery options
 * @returns Message ID from Svix
 */
export async function deliverWebhook(
  tenantId: string,
  event: WebhookEvent,
  options?: WebhookDeliveryOptions
): Promise<string> {
  const svix = getSvixClient();

  // Use eventId as idempotency key by default
  const idempotencyKey = options?.idempotencyKey || event.eventId;

  // Create message
  const message = await svix.message.create(tenantId, {
    eventType: event.type,
    payload: event,
    channels: options?.channels,
  }, {
    idempotencyKey,
  });

  return message.id;
}

/**
 * Delivers webhook with error handling and logging
 *
 * Catches errors and logs them without throwing
 */
export async function deliverWebhookSafe(
  tenantId: string,
  event: WebhookEvent,
  options?: WebhookDeliveryOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const messageId = await deliverWebhook(tenantId, event, options);
    return { success: true, messageId };
  } catch (error: any) {
    console.error('Webhook delivery failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// ============================================================================
// Tenant Management
// ============================================================================

/**
 * Gets or creates a tenant application in Svix
 */
export async function ensureSvixTenant(tenantId: string, tenantName: string): Promise<void> {
  const svix = getSvixClient();

  try {
    // Try to get existing tenant
    await svix.application.get(tenantId);
  } catch (error: any) {
    // If not found, create it
    if (error.status === 404 || error.statusCode === 404) {
      await svix.application.create({
        uid: tenantId,
        name: tenantName,
      });
    } else {
      throw error;
    }
  }
}

// ============================================================================
// Endpoint Management
// ============================================================================

export interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: WebhookEventType[];
  enabled: boolean;
  description?: string;
}

/**
 * Creates a webhook endpoint for a tenant
 */
export async function createWebhookEndpoint(
  tenantId: string,
  url: string,
  eventTypes: WebhookEventType[],
  description?: string
): Promise<WebhookEndpoint> {
  const svix = getSvixClient();

  const endpoint = await svix.endpoint.create(tenantId, {
    url,
    eventTypes,
    description,
  });

  return {
    id: endpoint.id,
    url: endpoint.url,
    eventTypes: endpoint.eventTypes as WebhookEventType[],
    enabled: !endpoint.disabled,
    description: endpoint.description || undefined,
  };
}

/**
 * Lists webhook endpoints for a tenant
 */
export async function listWebhookEndpoints(
  tenantId: string
): Promise<WebhookEndpoint[]> {
  const svix = getSvixClient();

  const response = await svix.endpoint.list(tenantId);

  return response.data.map((endpoint) => ({
    id: endpoint.id,
    url: endpoint.url,
    eventTypes: endpoint.eventTypes as WebhookEventType[],
    enabled: !endpoint.disabled,
    description: endpoint.description || undefined,
  }));
}

/**
 * Deletes a webhook endpoint
 */
export async function deleteWebhookEndpoint(
  tenantId: string,
  endpointId: string
): Promise<void> {
  const svix = getSvixClient();
  await svix.endpoint.delete(tenantId, endpointId);
}

/**
 * Updates a webhook endpoint
 */
export async function updateWebhookEndpoint(
  tenantId: string,
  endpointId: string,
  updates: {
    url?: string;
    eventTypes?: WebhookEventType[];
    enabled?: boolean;
    description?: string;
  }
): Promise<WebhookEndpoint> {
  const svix = getSvixClient();

  const endpoint = await svix.endpoint.update(tenantId, endpointId, {
    url: updates.url,
    eventTypes: updates.eventTypes,
    disabled: updates.enabled !== undefined ? !updates.enabled : undefined,
    description: updates.description,
  });

  return {
    id: endpoint.id,
    url: endpoint.url,
    eventTypes: endpoint.eventTypes as WebhookEventType[],
    enabled: !endpoint.disabled,
    description: endpoint.description || undefined,
  };
}

/**
 * Gets the secret for an endpoint (for signature verification)
 */
export async function getEndpointSecret(
  tenantId: string,
  endpointId: string
): Promise<string> {
  const svix = getSvixClient();
  const secret = await svix.endpoint.getSecret(tenantId, endpointId);
  return secret.key;
}

// ============================================================================
// Message Status
// ============================================================================

/**
 * Gets delivery status for a webhook message
 */
export async function getMessageStatus(
  tenantId: string,
  messageId: string
): Promise<{
  status: 'pending' | 'success' | 'fail';
  attempts: number;
  nextRetry?: string;
}> {
  const svix = getSvixClient();

  const message = await svix.message.get(tenantId, messageId);

  return {
    status: message.status === 0 ? 'pending' : message.status === 1 ? 'success' : 'fail',
    attempts: message.attempts || 0,
    nextRetry: message.nextAttempt?.toISOString(),
  };
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verifies webhook signature
 *
 * Use this in your webhook receiver endpoint
 */
export function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string
): boolean {
  const wh = new Svix.Webhook(secret);

  try {
    wh.verify(payload, headers as any);
    return true;
  } catch (error) {
    return false;
  }
}
