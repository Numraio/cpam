import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGET(req, res);
      case 'PATCH':
        return await handlePATCH(req, res);
      case 'DELETE':
        return await handleDELETE(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, calcId } = req.query;

  if (typeof slug !== 'string' || typeof calcId !== 'string') {
    return res.status(400).json({ error: 'Invalid slug or calcId' });
  }

  // Get team and verify membership
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!team || team.members.length === 0) {
    return res.status(403).json({ error: 'Forbidden: Not a member of this team' });
  }

  // Fetch calculation with results
  const calculation = await prisma.calcBatch.findFirst({
    where: {
      id: calcId,
      tenantId: team.id,
    },
  });

  if (!calculation) {
    return res.status(404).json({ error: 'Calculation not found' });
  }

  // Fetch results for this calculation
  const results = await prisma.calcResult.findMany({
    where: {
      calcBatchId: calcId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.status(200).json({ calculation, results });
}

async function handlePATCH(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, calcId } = req.query;

  if (typeof slug !== 'string' || typeof calcId !== 'string') {
    return res.status(400).json({ error: 'Invalid slug or calcId' });
  }

  // Get team and verify membership
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!team || team.members.length === 0) {
    return res.status(403).json({ error: 'Forbidden: Not a member of this team' });
  }

  // Check that calculation exists and belongs to team
  const calculation = await prisma.calcBatch.findFirst({
    where: {
      id: calcId,
      tenantId: team.id,
    },
  });

  if (!calculation) {
    return res.status(404).json({ error: 'Calculation not found' });
  }

  const { status, error } = req.body;

  const updatedCalculation = await prisma.calcBatch.update({
    where: {
      id: calcId,
    },
    data: {
      ...(status && { status }),
      ...(error && { error }),
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
    },
  });

  return res.status(200).json({ calculation: updatedCalculation });
}

async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, calcId } = req.query;

  if (typeof slug !== 'string' || typeof calcId !== 'string') {
    return res.status(400).json({ error: 'Invalid slug or calcId' });
  }

  // Get team and verify membership
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!team || team.members.length === 0) {
    return res.status(403).json({ error: 'Forbidden: Not a member of this team' });
  }

  // Check that calculation exists and belongs to team
  const calculation = await prisma.calcBatch.findFirst({
    where: {
      id: calcId,
      tenantId: team.id,
    },
  });

  if (!calculation) {
    return res.status(404).json({ error: 'Calculation not found' });
  }

  // Delete results first (foreign key constraint)
  await prisma.calcResult.deleteMany({
    where: {
      calcBatchId: calcId,
    },
  });

  // Delete calculation
  await prisma.calcBatch.delete({
    where: {
      id: calcId,
    },
  });

  return res.status(200).json({ message: 'Calculation deleted successfully' });
}
