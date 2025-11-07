/**
 * API: Single Item (Update/Delete)
 *
 * PATCH /api/teams/:slug/items/:itemId - Update item
 * DELETE /api/teams/:slug/items/:itemId - Delete item
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { decrementUsage } from '@/lib/billing/usage-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, itemId } = req.query;

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
    case 'PATCH':
      return handleUpdate(req, res, tenantId, itemId as string);
    case 'DELETE':
      return handleDelete(req, res, tenantId, itemId as string);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Update item
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  itemId: string
) {
  try {
    const { name, description } = req.body;

    const item = await prisma.item.update({
      where: {
        id: itemId,
        tenantId, // Ensure item belongs to tenant
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({ item });
  } catch (error: any) {
    console.error('Failed to update item:', error);
    return res.status(500).json({
      error: 'Failed to update item',
      message: error.message,
    });
  }
}

/**
 * Delete item (decrements usage counter)
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  itemId: string
) {
  try {
    // Delete item
    await prisma.item.delete({
      where: {
        id: itemId,
        tenantId, // Ensure item belongs to tenant
      },
    });

    // Decrement usage counter
    await decrementUsage(tenantId);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete item:', error);
    return res.status(500).json({
      error: 'Failed to delete item',
      message: error.message,
    });
  }
}
