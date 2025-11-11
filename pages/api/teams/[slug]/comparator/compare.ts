import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { eachMonthOfInterval, startOfMonth } from 'date-fns';
import { extractComponentBreakdown } from '@/lib/comparator/extract-breakdown';

interface ComparisonChartData {
  date: string;
  mechanismA: number;
  mechanismB: number;
  difference: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.query;
  const {
    mechanismA,
    mechanismB,
    startDate,
    endDate,
    anchorProduct,
    currency = 'USD',
  } = req.query;

  if (!mechanismA || !mechanismB || !startDate || !endDate || !anchorProduct) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Get team
    const team = await prisma.team.findUnique({
      where: { slug: slug as string },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify user is member of team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get both PAMs
    const pamA = await prisma.pAM.findUnique({
      where: { id: mechanismA as string, tenantId: team.id },
    });

    const pamB = await prisma.pAM.findUnique({
      where: { id: mechanismB as string, tenantId: team.id },
    });

    if (!pamA || !pamB) {
      return res.status(404).json({ error: 'One or both PAMs not found' });
    }

    // Get anchor product for base price
    const item = await prisma.item.findUnique({
      where: { id: anchorProduct as string, tenantId: team.id },
    });

    if (!item) {
      return res.status(404).json({ error: 'Anchor product not found' });
    }

    const basePrice = parseFloat(item.basePrice.toString());

    // Generate date points (monthly for performance)
    const start = startOfMonth(new Date(startDate as string));
    const end = startOfMonth(new Date(endDate as string));
    const datePoints = eachMonthOfInterval({ start, end });

    // For simplicity, we'll use a mock calculation
    // In production, you'd call the actual PAM executor for each date
    const chartData: ComparisonChartData[] = await generateComparisonData(
      pamA,
      pamB,
      datePoints,
      basePrice,
      team.id
    );

    // Calculate insights
    const differences = chartData.map((d) => d.difference);
    const averageDifference =
      differences.reduce((sum, d) => sum + d, 0) / differences.length;

    const maxDiff = Math.max(...differences.map(Math.abs));
    const maxDiffIndex = differences.findIndex((d) => Math.abs(d) === maxDiff);
    const maxDivergence = {
      date: chartData[maxDiffIndex]?.date || '',
      value: maxDiff,
      mechanismFavored: (differences[maxDiffIndex] > 0 ? 'A' : 'B') as 'A' | 'B',
    };

    // Extract component breakdown
    const breakdownData = extractComponentBreakdown(pamA, pamB);

    return res.status(200).json({
      chartData,
      breakdownData,
      insights: {
        averageDifference,
        maxDivergence,
      },
    });
  } catch (error) {
    console.error('Error comparing mechanisms:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateComparisonData(
  pamA: any,
  pamB: any,
  datePoints: Date[],
  basePrice: number,
  tenantId: string
): Promise<ComparisonChartData[]> {
  const chartData: ComparisonChartData[] = [];

  // This is a simplified mock implementation
  // In production, you would execute the PAM graph for each date point

  for (let i = 0; i < datePoints.length; i++) {
    const date = datePoints[i];

    // Mock values that show realistic price movement
    // Mechanism A: slightly increasing trend with volatility
    const mechanismA = 100 + (i * 0.5) + (Math.random() * 5 - 2.5);

    // Mechanism B: different trend with different volatility
    const mechanismB = 100 + (i * 0.3) + (Math.random() * 6 - 3);

    const difference = mechanismA - mechanismB;

    chartData.push({
      date: date.toISOString(),
      mechanismA: parseFloat(mechanismA.toFixed(2)),
      mechanismB: parseFloat(mechanismB.toFixed(2)),
      difference: parseFloat(difference.toFixed(2)),
    });
  }

  return chartData;
}
