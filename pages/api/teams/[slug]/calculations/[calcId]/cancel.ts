import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
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

    // Only allow cancelling QUEUED or RUNNING calculations
    if (calculation.status !== 'QUEUED' && calculation.status !== 'RUNNING') {
      return res.status(400).json({ error: `Cannot cancel calculation with status ${calculation.status}` });
    }

    // Update status to FAILED with cancellation message
    const updatedCalculation = await prisma.calcBatch.update({
      where: {
        id: calcId,
      },
      data: {
        status: 'FAILED',
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    return res.status(200).json({ calculation: updatedCalculation });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
