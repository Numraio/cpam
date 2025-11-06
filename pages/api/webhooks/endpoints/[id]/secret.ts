/**
 * Webhook Endpoint Secret API
 *
 * GET /api/webhooks/endpoints/:id/secret - Get signing secret
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAccess } from '@/lib/authz';
import { getEndpointSecret } from '@/lib/webhooks/webhook-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require admin access
  const session = await requireAdminAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid endpoint ID' });
  }

  try {
    const secret = await getEndpointSecret(tenantId, id);

    return res.status(200).json({ secret });
  } catch (error: any) {
    console.error('Get endpoint secret error:', error);

    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to get endpoint secret',
    });
  }
}
