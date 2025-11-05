/**
 * Audit Export API
 *
 * GET /api/audit/export
 *
 * Query params:
 * - entityType (optional): Filter by entity type
 * - entityId (optional): Filter by entity ID
 * - action (optional): Filter by action
 * - userId (optional): Filter by user ID
 * - correlationId (optional): Filter by correlation ID
 * - startDate (optional): Filter by start date (ISO 8601)
 * - endDate (optional): Filter by end date (ISO 8601)
 * - format (optional): "jsonl" (default) or "json"
 * - download (optional): "true" to download as file
 *
 * Returns:
 * - JSONL content (one JSON object per line)
 * - X-Export-Hash header with SHA-256 hash
 * - X-Export-Count header with total entry count
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportAuditLogsAsJSONL } from '@/lib/audit/audit-export';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const session = await getSession(req, res);
  if (!session?.user?.teamId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = session.user.teamId;

  // Query params
  const {
    entityType,
    entityId,
    action,
    userId,
    correlationId,
    startDate,
    endDate,
    format = 'jsonl',
    download,
  } = req.query;

  // Validate format
  if (format !== 'jsonl' && format !== 'json') {
    return res.status(400).json({ error: 'Invalid format. Must be "jsonl" or "json"' });
  }

  try {
    // Export audit logs
    const result = await exportAuditLogsAsJSONL(prisma, {
      tenantId,
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      action: action as string | undefined,
      userId: userId as string | undefined,
      correlationId: correlationId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      includeHash: true,
    });

    // Set headers
    res.setHeader('X-Export-Hash', result.hash || '');
    res.setHeader('X-Export-Count', result.totalEntries.toString());

    // Download as file?
    if (download === 'true') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `audit-export-${timestamp}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    // Return content
    if (format === 'jsonl') {
      res.setHeader('Content-Type', 'application/x-ndjson');
      return res.status(200).send(result.jsonl);
    } else {
      // JSON format: wrap in array
      const lines = result.jsonl.split('\n').filter((line) => line.trim());
      const records = lines.map((line) => JSON.parse(line));
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        totalEntries: result.totalEntries,
        hash: result.hash,
        records,
      });
    }
  } catch (error: any) {
    console.error('Audit export error:', error);
    return res.status(500).json({ error: error.message || 'Export failed' });
  }
}
