/**
 * Job Queue Metrics API
 *
 * GET /api/jobs/metrics - Get queue metrics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAccess } from '@/lib/authz';
import { getAllQueueMetrics } from '@/lib/queue/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require admin access
  const session = await requireAdminAccess(req, res);
  if (!session) return;

  try {
    const metrics = await getAllQueueMetrics();

    return res.status(200).json({ metrics });
  } catch (error: any) {
    console.error('Get queue metrics error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get queue metrics',
    });
  }
}
