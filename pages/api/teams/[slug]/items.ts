/**
 * API: Items (CRUD)
 *
 * POST /api/teams/:slug/items - Create item
 * GET /api/teams/:slug/items - List items
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canCreateItem, incrementUsage } from '@/lib/billing/usage-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.query;

  // Get team
  const team = await prisma.team.findUnique({
    where: { slug: slug as string },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tenantId = team.id;

  switch (req.method) {
    case 'POST':
      return handleCreate(req, res, tenantId);
    case 'GET':
      return handleList(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Create item with plan gate enforcement
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    // Check if tenant can create item (plan gate)
    const check = await canCreateItem(tenantId);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Plan limit exceeded',
        message: check.reason,
        usage: check.usage,
        upgradeRequired: true,
      });
    }

    // Create item (simplified - add full validation in production)
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const item = await prisma.item.create({
      data: {
        tenantId,
        name,
        description,
        // Add other required fields based on schema
      },
    });

    // Increment usage counter
    await incrementUsage(tenantId);

    return res.status(201).json({
      item,
      usage: check.usage,
    });
  } catch (error: any) {
    console.error('Failed to create item:', error);
    return res.status(500).json({
      error: 'Failed to create item',
      message: error.message,
    });
  }
}

/**
 * List items for tenant
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ items });
  } catch (error: any) {
    console.error('Failed to list items:', error);
    return res.status(500).json({
      error: 'Failed to list items',
      message: error.message,
    });
  }
}
