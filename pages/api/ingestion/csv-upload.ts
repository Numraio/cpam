/**
 * API: Manual CSV Upload for Data Ingestion
 *
 * POST /api/ingestion/csv-upload - Upload CSV file (owner only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireOwnerAccess } from '@/lib/authz';
import { CSVAdapter } from '@/lib/ingestion/adapters/csv-adapter';
import { runIngestion } from '@/lib/ingestion/ingestion-service';
import type { IngestionRequest, IngestionResult } from '@/lib/ingestion/adapter-interface';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB CSV files
    },
  },
};

interface CSVUploadRequest {
  csvData: string; // CSV content as string
  seriesCodes?: string[]; // Optional filter
  startDate?: string; // Optional filter
  endDate?: string; // Optional filter
  force?: boolean; // Force upsert even if exists
}

interface CSVUploadResponse {
  success: boolean;
  result: IngestionResult;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only owners can upload CSV data
  const session = await requireOwnerAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;

  return handleUpload(req, res, tenantId);
}

/**
 * Handles CSV upload
 */
async function handleUpload(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const body = req.body as CSVUploadRequest;

    if (!body.csvData) {
      return res.status(400).json({ error: 'csvData is required' });
    }

    // Create CSV adapter
    const adapter = new CSVAdapter(body.csvData);

    // Build ingestion request
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const request: IngestionRequest = {
      tenantId,
      seriesCodes: body.seriesCodes || [], // Empty = all series in CSV
      startDate: body.startDate ? new Date(body.startDate) : oneYearAgo,
      endDate: body.endDate ? new Date(body.endDate) : now,
      force: body.force || false,
    };

    // Run ingestion
    const result = await runIngestion(adapter, request);

    const response: CSVUploadResponse = {
      success: result.errors.length === 0,
      result,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('CSV upload failed:', error);
    return res.status(500).json({
      error: 'CSV upload failed',
      message: error.message,
    });
  }
}
