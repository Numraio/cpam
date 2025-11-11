import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, pamId } = req.query;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['DRAFT', 'TEST', 'ACTIVE'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be DRAFT, TEST, or ACTIVE' });
  }

  try {
    // Get team
    const team = await prisma.team.findUnique({
      where: { slug: slug as string },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update PAM status
    const pam = await prisma.pAM.update({
      where: {
        id: pamId as string,
        tenantId: team.id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({ pam });
  } catch (error: any) {
    console.error('Failed to update PAM status:', error);
    return res.status(500).json({
      error: 'Failed to update PAM status',
      message: error.message,
    });
  }
}
