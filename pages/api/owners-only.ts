/**
 * Owners-Only API Endpoint (Example)
 *
 * Demonstrates owner-only authorization
 *
 * GET /api/owners-only
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOwnerAccess } from '@/lib/authz';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require owner access
  const session = await requireOwnerAccess(req, res);
  if (!session) return; // Error already sent

  // Owner-only logic here
  return res.status(200).json({
    message: 'You are an owner!',
    userId: session.user.id,
    teamId: session.user.teamId,
    role: session.user.role,
  });
}
