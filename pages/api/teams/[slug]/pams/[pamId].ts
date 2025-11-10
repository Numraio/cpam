/**
 * API: PAM (Single)
 *
 * GET /api/teams/:slug/pams/:pamId - Get PAM by ID
 * PATCH /api/teams/:slug/pams/:pamId - Update PAM
 * DELETE /api/teams/:slug/pams/:pamId - Delete PAM
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { validateGraphSchema } from '@/lib/pam/graph-schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, pamId } = req.query;

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

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, pamId as string, team.id);
    case 'PATCH':
      return handleUpdate(req, res, pamId as string, team.id);
    case 'DELETE':
      return handleDelete(req, res, pamId as string, team.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get PAM by ID
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  pamId: string,
  tenantId: string
) {
  try {
    const pam = await prisma.pAM.findFirst({
      where: {
        id: pamId,
        tenantId,
      },
    });

    if (!pam) {
      return res.status(404).json({ error: 'PAM not found' });
    }

    return res.status(200).json({ pam });
  } catch (error: any) {
    console.error('Failed to fetch PAM:', error);
    return res.status(500).json({
      error: 'Failed to fetch PAM',
      message: error.message,
    });
  }
}

/**
 * Update PAM
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  pamId: string,
  tenantId: string
) {
  try {
    const { name, description, graph } = req.body;

    // Validate graph if provided
    if (graph) {
      const validation = validateGraphSchema(graph);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid graph structure',
          errors: validation.errors,
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (graph !== undefined) updateData.graph = graph;

    const pam = await prisma.pAM.update({
      where: { id: pamId },
      data: updateData,
    });

    return res.status(200).json({ pam });
  } catch (error: any) {
    console.error('Failed to update PAM:', error);
    return res.status(500).json({
      error: 'Failed to update PAM',
      message: error.message,
    });
  }
}

/**
 * Delete PAM
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  pamId: string,
  tenantId: string
) {
  try {
    await prisma.pAM.delete({
      where: { id: pamId },
    });

    return res.status(200).json({ message: 'PAM deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete PAM:', error);
    return res.status(500).json({
      error: 'Failed to delete PAM',
      message: error.message,
    });
  }
}
