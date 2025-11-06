/**
 * Webhook Endpoints API
 *
 * Manage webhook endpoints for a tenant
 *
 * GET /api/webhooks/endpoints - List endpoints
 * POST /api/webhooks/endpoints - Create endpoint
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAccess } from '@/lib/authz';
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  ensureSvixTenant,
} from '@/lib/webhooks/webhook-service';
import type { WebhookEventType } from '@/lib/webhooks/events';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require admin access (only admins can manage webhooks)
  const session = await requireAdminAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;

  switch (req.method) {
    case 'GET':
      return handleList(tenantId, req, res);

    case 'POST':
      return handleCreate(tenantId, req, res);

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/webhooks/endpoints
 *
 * Lists webhook endpoints for the tenant
 */
async function handleList(
  tenantId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endpoints = await listWebhookEndpoints(tenantId);

    return res.status(200).json({ endpoints });
  } catch (error: any) {
    console.error('List webhooks error:', error);

    // If tenant doesn't exist in Svix, return empty array
    if (error.status === 404 || error.statusCode === 404) {
      return res.status(200).json({ endpoints: [] });
    }

    return res.status(500).json({
      error: error.message || 'Failed to list webhook endpoints',
    });
  }
}

/**
 * POST /api/webhooks/endpoints
 *
 * Creates a new webhook endpoint
 *
 * Body:
 * {
 *   "url": "https://example.com/webhooks",
 *   "eventTypes": ["calc.batch.completed", "calc.batch.approved"],
 *   "description": "Production webhook"
 * }
 */
async function handleCreate(
  tenantId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url, eventTypes, description } = req.body;

  // Validation
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required and must be a string' });
  }

  if (!eventTypes || !Array.isArray(eventTypes) || eventTypes.length === 0) {
    return res.status(400).json({
      error: 'eventTypes is required and must be a non-empty array',
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'url must be a valid URL' });
  }

  try {
    // Ensure tenant exists in Svix
    const team = await prisma.team.findUnique({
      where: { id: tenantId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await ensureSvixTenant(tenantId, team.name);

    // Create endpoint
    const endpoint = await createWebhookEndpoint(
      tenantId,
      url,
      eventTypes as WebhookEventType[],
      description
    );

    return res.status(201).json({ endpoint });
  } catch (error: any) {
    console.error('Create webhook error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create webhook endpoint',
    });
  }
}
