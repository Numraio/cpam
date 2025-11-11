import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  startOfQuarter,
} from 'date-fns';

interface SeriesData {
  seriesCode: string;
  seriesName: string;
  values: Array<{
    date: string;
    actualValue: number;
    normalizedValue: number;
  }>;
}

interface AuditTrailEntry {
  date: string;
  mechanismIndexValue: number;
  componentName: string;
  actualValue: number;
  normalizedValue: number;
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

  const { slug, pamId } = req.query;
  const { startDate, endDate, baselineDate, frequency = 'MONTHLY' } = req.query;

  if (!startDate || !endDate || !baselineDate) {
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

    // Get PAM
    const pam = await prisma.pAM.findUnique({
      where: {
        id: pamId as string,
        tenantId: team.id,
      },
    });

    if (!pam) {
      return res.status(404).json({ error: 'PAM not found' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const baseline = new Date(baselineDate as string);

    // Extract index series from PAM graph
    const graph = pam.graph as any;
    const factorNodes = graph.nodes?.filter((n: any) => n.type === 'Factor') || [];
    const seriesCodes = factorNodes
      .filter((n: any) => n.config?.series)
      .map((n: any) => n.config.series);

    if (seriesCodes.length === 0) {
      return res.status(200).json({
        componentData: [],
        mechanismData: [],
        auditTrail: [],
        averagingRule: 'No index series configured',
      });
    }

    // Generate date points based on frequency
    const datePoints = generateDatePoints(start, end, frequency as string);

    // Fetch historical index values for all series
    const componentData: SeriesData[] = [];
    const auditTrailEntries: AuditTrailEntry[] = [];

    for (const seriesCode of seriesCodes) {
      const indexSeries = await prisma.indexSeries.findFirst({
        where: {
          tenantId: team.id,
          seriesCode,
        },
      });

      if (!indexSeries) continue;

      const indexValues = await prisma.indexValue.findMany({
        where: {
          tenantId: team.id,
          seriesId: indexSeries.id,
          asOfDate: {
            gte: start,
            lte: end,
          },
          versionTag: 'FINAL',
        },
        orderBy: { asOfDate: 'asc' },
      });

      // Find baseline value
      const baselineValue = await prisma.indexValue.findFirst({
        where: {
          tenantId: team.id,
          seriesId: indexSeries.id,
          asOfDate: {
            lte: baseline,
          },
          versionTag: 'FINAL',
        },
        orderBy: { asOfDate: 'desc' },
        take: 1,
      });

      if (!baselineValue) continue;

      // Normalize values
      const normalizedValues = indexValues.map((v) => {
        const normalizedValue = (parseFloat(v.value.toString()) / parseFloat(baselineValue.value.toString())) * 100;

        // Add to audit trail
        auditTrailEntries.push({
          date: v.asOfDate.toISOString(),
          mechanismIndexValue: normalizedValue,
          componentName: indexSeries.name,
          actualValue: parseFloat(v.value.toString()),
          normalizedValue,
        });

        return {
          date: v.asOfDate.toISOString(),
          actualValue: parseFloat(v.value.toString()),
          normalizedValue,
        };
      });

      componentData.push({
        seriesCode,
        seriesName: indexSeries.name,
        values: normalizedValues,
      });
    }

    // For Mechanism Performance view, calculate blended value
    // This is a simplified version - in production, you'd run the full PAM executor
    const mechanismData = datePoints.map((date) => {
      // Average of all components at this date (simplified logic)
      let sum = 0;
      let count = 0;

      for (const series of componentData) {
        const value = series.values.find((v) => {
          const vDate = new Date(v.date);
          return vDate.toDateString() === date.toDateString();
        });
        if (value) {
          sum += value.normalizedValue;
          count++;
        }
      }

      const avgNormalized = count > 0 ? sum / count : 100;

      return {
        date: date.toISOString(),
        actualValue: avgNormalized, // In real implementation, use PAM executor
        normalizedValue: avgNormalized,
      };
    });

    // Extract averaging rule from first FactorNode
    const averagingRule = factorNodes.length > 0 && factorNodes[0].config?.operation
      ? `${factorNodes[0].config.operation} ${factorNodes[0].config.lagDays ? `with ${factorNodes[0].config.lagDays} day lag` : ''}`
      : 'No averaging rule specified';

    return res.status(200).json({
      componentData,
      mechanismData,
      auditTrail: auditTrailEntries,
      averagingRule,
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateDatePoints(
  start: Date,
  end: Date,
  frequency: string
): Date[] {
  switch (frequency) {
    case 'DAILY':
      return eachDayOfInterval({ start, end });
    case 'WEEKLY':
      return eachWeekOfInterval({ start, end });
    case 'MONTHLY':
      return eachMonthOfInterval({ start, end });
    case 'QUARTERLY':
      return eachQuarterOfInterval({ start, end }).map(startOfQuarter);
    default:
      return eachMonthOfInterval({ start, end });
  }
}
