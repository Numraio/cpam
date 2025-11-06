/**
 * Price Math Report API
 *
 * GET /api/reports/price-math?batchId=xxx&format=pdf|csv&itemId=yyy
 *
 * Generates branded PDF or CSV report for batch calculations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  fetchReportData,
  generatePDF,
  generateCSV,
  generateDetailedCSV,
  type BrandingOptions,
} from '@/lib/reports/price-math-report';

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
  const { batchId, format = 'pdf', itemId, detailed } = req.query;

  if (!batchId || typeof batchId !== 'string') {
    return res.status(400).json({ error: 'batchId is required' });
  }

  if (format !== 'pdf' && format !== 'csv') {
    return res.status(400).json({ error: 'format must be "pdf" or "csv"' });
  }

  try {
    // Fetch report data
    const data = await fetchReportData(prisma, {
      tenantId,
      batchId,
      itemId: itemId as string | undefined,
    });

    // Get branding from tenant
    const tenant = await prisma.team.findUnique({
      where: { id: tenantId },
    });

    const branding: BrandingOptions = {
      tenantName: tenant?.name || 'Price Math Report',
      primaryColor: '#2563eb', // Can be customized per tenant
      secondaryColor: '#64748b',
    };

    // Generate report
    if (format === 'pdf') {
      // Generate PDF
      const pdfStream = generatePDF(data, branding);

      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="price-math-${batchId}.pdf"`
      );

      // Pipe PDF stream to response
      pdfStream.pipe(res);
    } else {
      // Generate CSV
      const csv =
        detailed === 'true'
          ? generateDetailedCSV(data)
          : generateCSV(data);

      // Set headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="price-math-${batchId}.csv"`
      );

      // Send CSV
      res.status(200).send(csv);
    }
  } catch (error: any) {
    console.error('Report generation error:', error);
    return res.status(500).json({ error: error.message || 'Report generation failed' });
  }
}
