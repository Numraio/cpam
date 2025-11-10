import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    // Only allow exporting COMPLETED calculations
    if (calculation.status !== 'COMPLETED') {
      return res.status(400).json({ error: `Cannot export calculation with status ${calculation.status}` });
    }

    // Fetch all results for this calculation
    const results = await prisma.calcResult.findMany({
      where: {
        calcBatchId: calcId,
      },
      include: {
        item: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Generate CSV
    const csvHeaders = [
      'Result ID',
      'Item ID',
      'Item SKU',
      'Item Name',
      'Adjusted Price',
      'Adjusted Currency',
      'Effective Date',
      'Is Approved',
      'Created At',
    ];

    const csvRows = results.map((result) => [
      result.id,
      result.itemId,
      result.item?.sku || 'N/A',
      result.item?.name || 'N/A',
      result.adjustedPrice.toString(),
      result.adjustedCurrency,
      new Date(result.effectiveDate).toISOString(),
      result.isApproved ? 'Yes' : 'No',
      new Date(result.createdAt).toISOString(),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="calculation-${calcId}.csv"`);

    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
