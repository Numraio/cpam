/**
 * API: Ingestion Scheduling
 *
 * POST /api/ingestion/schedule - Schedule daily ingestion (owner only)
 * DELETE /api/ingestion/schedule - Cancel scheduled ingestion (owner only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOwnerAccess } from '@/lib/authz';
import {
  scheduleDailyIngestion,
  cancelScheduledIngestion,
  triggerManualIngestion,
} from '@/lib/ingestion/scheduler';

interface ScheduleRequest {
  provider: string; // "OANDA", etc.
  seriesCodes: string[]; // Series codes to fetch
  cronSchedule?: string; // Optional cron schedule (default: "0 1 * * *")
}

interface TriggerRequest {
  provider: string;
  seriesCodes: string[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  force?: boolean;
}

interface CancelRequest {
  provider: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only owners can manage ingestion schedules
  const session = await requireOwnerAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;

  switch (req.method) {
    case 'POST':
      // Check if this is a trigger or schedule request
      const body = req.body;
      if (body.startDate && body.endDate) {
        return handleTrigger(req, res, tenantId);
      } else {
        return handleSchedule(req, res, tenantId);
      }
    case 'DELETE':
      return handleCancel(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Schedules daily ingestion
 */
async function handleSchedule(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const body = req.body as ScheduleRequest;

    if (!body.provider || !body.seriesCodes || body.seriesCodes.length === 0) {
      return res.status(400).json({
        error: 'provider and seriesCodes are required',
      });
    }

    await scheduleDailyIngestion(
      tenantId,
      body.provider,
      body.seriesCodes,
      body.cronSchedule
    );

    return res.status(200).json({
      success: true,
      message: `Scheduled daily ingestion for ${body.provider}`,
    });
  } catch (error: any) {
    console.error('Failed to schedule ingestion:', error);
    return res.status(500).json({
      error: 'Failed to schedule ingestion',
      message: error.message,
    });
  }
}

/**
 * Triggers manual ingestion
 */
async function handleTrigger(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const body = req.body as TriggerRequest;

    if (!body.provider || !body.seriesCodes || !body.startDate || !body.endDate) {
      return res.status(400).json({
        error: 'provider, seriesCodes, startDate, and endDate are required',
      });
    }

    await triggerManualIngestion(
      tenantId,
      body.provider,
      body.seriesCodes,
      new Date(body.startDate),
      new Date(body.endDate),
      body.force
    );

    return res.status(200).json({
      success: true,
      message: `Triggered ingestion for ${body.provider}`,
    });
  } catch (error: any) {
    console.error('Failed to trigger ingestion:', error);
    return res.status(500).json({
      error: 'Failed to trigger ingestion',
      message: error.message,
    });
  }
}

/**
 * Cancels scheduled ingestion
 */
async function handleCancel(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const body = req.body as CancelRequest;

    if (!body.provider) {
      return res.status(400).json({ error: 'provider is required' });
    }

    await cancelScheduledIngestion(tenantId, body.provider);

    return res.status(200).json({
      success: true,
      message: `Cancelled scheduled ingestion for ${body.provider}`,
    });
  } catch (error: any) {
    console.error('Failed to cancel ingestion:', error);
    return res.status(500).json({
      error: 'Failed to cancel ingestion',
      message: error.message,
    });
  }
}
