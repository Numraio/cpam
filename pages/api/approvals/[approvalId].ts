/**
 * API: Single Approval (Get/Update)
 *
 * GET /api/approvals/:id - Get approval details
 * POST /api/approvals/:id/approve - Approve
 * POST /api/approvals/:id/reject - Reject
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { approvalId } = req.query;

  // Get user's teams
  const teams = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    include: { team: true },
  });

  if (teams.length === 0) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tenantId = teams[0].team.id;

  // Verify approval belongs to tenant
  const approval = await prisma.approvalEvent.findUnique({
    where: { id: approvalId as string },
  });

  if (!approval || approval.tenantId !== tenantId) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, approvalId as string);
    case 'POST':
      const action = req.body.action;
      if (action === 'approve') {
        return handleApprove(req, res, approvalId as string, session.user.id);
      } else if (action === 'reject') {
        return handleReject(req, res, approvalId as string, session.user.id);
      }
      return res.status(400).json({ error: 'Invalid action' });
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  approvalId: string
) {
  try {
    const approval = await prisma.approvalEvent.findUnique({
      where: { id: approvalId },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ approval });
  } catch (error: any) {
    console.error('Failed to get approval:', error);
    return res.status(500).json({
      error: 'Failed to get approval',
      message: error.message,
    });
  }
}

async function handleApprove(
  req: NextApiRequest,
  res: NextApiResponse,
  approvalId: string,
  userId: string
) {
  try {
    const { comment } = req.body;

    const approval = await prisma.approvalEvent.update({
      where: { id: approvalId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        comments: comment || null,
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ approval });
  } catch (error: any) {
    console.error('Failed to approve:', error);
    return res.status(500).json({
      error: 'Failed to approve',
      message: error.message,
    });
  }
}

async function handleReject(
  req: NextApiRequest,
  res: NextApiResponse,
  approvalId: string,
  userId: string
) {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }

    const approval = await prisma.approvalEvent.update({
      where: { id: approvalId },
      data: {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        comments: comment,
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ approval });
  } catch (error: any) {
    console.error('Failed to reject:', error);
    return res.status(500).json({
      error: 'Failed to reject',
      message: error.message,
    });
  }
}
