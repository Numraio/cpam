/**
 * Webhook Endpoint Management API
 *
 * PATCH /api/webhooks/endpoints/:id - Update endpoint
 * DELETE /api/webhooks/endpoints/:id - Delete endpoint
 * GET /api/webhooks/endpoints/:id/secret - Get endpoint secret
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAccess } from '@/lib/authz';
import {
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getEndpointSecret,
} from '@/lib/webhooks/webhook-service';
import type { WebhookEventType } from '@/lib/webhooks/events';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require admin access
  const session = await requireAdminAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid endpoint ID' });
  }

  switch (req.method) {
    case 'PATCH':
      return handleUpdate(tenantId, id, req, res);

    case 'DELETE':
      return handleDelete(tenantId, id, req, res);

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * PATCH /api/webhooks/endpoints/:id
 *
 * Updates a webhook endpoint
 */
async function handleUpdate(
  tenantId: string,
  endpointId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url, eventTypes, enabled, description } = req.body;

  // Validate URL if provided
  if (url && typeof url !== 'string') {
    return res.status(400).json({ error: 'url must be a string' });
  }

  if (url) {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'url must be a valid URL' });
    }
  }

  // Validate eventTypes if provided
  if (eventTypes && (!Array.isArray(eventTypes) || eventTypes.length === 0)) {
    return res.status(400).json({
      error: 'eventTypes must be a non-empty array',
    });
  }

  try {
    const endpoint = await updateWebhookEndpoint(tenantId, endpointId, {
      url,
      eventTypes: eventTypes as WebhookEventType[] | undefined,
      enabled,
      description,
    });

    return res.status(200).json({ endpoint });
  } catch (error: any) {
    console.error('Update webhook error:', error);

    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to update webhook endpoint',
    });
  }
}

/**
 * DELETE /api/webhooks/endpoints/:id
 *
 * Deletes a webhook endpoint
 */
async function handleDelete(
  tenantId: string,
  endpointId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await deleteWebhookEndpoint(tenantId, endpointId);

    return res.status(200).json({ message: 'Endpoint deleted' });
  } catch (error: any) {
    console.error('Delete webhook error:', error);

    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to delete webhook endpoint',
    });
  }
}
