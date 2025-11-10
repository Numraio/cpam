/**
 * API: PAMs (List/Create)
 *
 * GET /api/teams/:slug/pams - List PAMs
 * POST /api/teams/:slug/pams - Create PAM
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
    case 'GET':
      return handleList(req, res, tenantId);
    case 'POST':
      return handleCreate(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * List PAMs
 */
async function handleList(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const pams = await prisma.pAM.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        graph: true,
      },
    });

    return res.status(200).json({ pams });
  } catch (error: any) {
    console.error('Failed to list PAMs:', error);
    return res.status(500).json({
      error: 'Failed to list PAMs',
      message: error.message,
    });
  }
}

/**
 * Create PAM
 */
async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  userId: string
) {
  try {
    const { name, description, graph } = req.body;

    if (!name || !graph) {
      return res.status(400).json({ error: 'name and graph are required' });
    }

    // Validate graph structure
    const validation = validateGraphSchema(graph);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid graph structure',
        errors: validation.errors,
      });
    }

    const pam = await prisma.pAM.create({
      data: {
        tenantId,
        name,
        description,
        graph,
        createdBy: userId,
      },
    });

    return res.status(201).json({ pam });
  } catch (error: any) {
    console.error('Failed to create PAM:', error);
    return res.status(500).json({
      error: 'Failed to create PAM',
      message: error.message,
    });
  }
}
