/**
 * API: Comprehensive Health Check Endpoint
 *
 * GET /api/health - Health check for load balancers and monitoring
 * GET /api/health?detailed=true - Detailed health check with all dependencies
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

import packageInfo from '../../package.json';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckStatus;
    memory: CheckStatus;
  };
  details?: {
    queueDepth?: number;
    lastIngestion?: string;
    activeSessions?: number;
  };
}

interface CheckStatus {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResult | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const detailed = req.query.detailed === 'true';
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'pass' },
    memory: { status: 'pass' },
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // 1. Database health check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbTime = Date.now() - dbStart;

      checks.database = {
        status: dbTime < 100 ? 'pass' : dbTime < 500 ? 'warn' : 'fail',
        responseTime: dbTime,
        message: `Database responding in ${dbTime}ms`,
      };

      if (checks.database.status === 'fail') {
        overallStatus = 'unhealthy';
      } else if (checks.database.status === 'warn') {
        overallStatus = 'degraded';
      }
    } catch (error: any) {
      checks.database = {
        status: 'fail',
        message: `Database connection failed: ${error.message}`,
      };
      overallStatus = 'unhealthy';
    }

    // 2. Memory health check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    checks.memory = {
      status:
        heapUsagePercent < 80 ? 'pass' : heapUsagePercent < 90 ? 'warn' : 'fail',
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`,
      details: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapUsagePercent: heapUsagePercent.toFixed(1),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
    };

    if (checks.memory.status === 'fail') {
      overallStatus = 'unhealthy';
    } else if (checks.memory.status === 'warn' && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }

    // 3. Additional details (only if detailed=true)
    let details: HealthCheckResult['details'] | undefined;

    if (detailed) {
      details = {};

      try {
        // Queue depth
        const queuedBatches = await prisma.calcBatch.count({
          where: { status: 'QUEUED' },
        });
        details.queueDepth = queuedBatches;

        // Last ingestion
        const lastIngestion = await prisma.indexValue.findFirst({
          orderBy: { ingestedAt: 'desc' },
          select: { ingestedAt: true },
        });
        if (lastIngestion) {
          details.lastIngestion = lastIngestion.ingestedAt.toISOString();
        }
      } catch (error) {
        // Don't fail health check if optional details fail
        console.error('Failed to fetch health check details:', error);
      }
    }

    // Build response
    const response: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: packageInfo.version,
      checks,
      ...(details && Object.keys(details).length > 0 && { details }),
    };

    // Set appropriate HTTP status code
    const statusCode =
      overallStatus === 'healthy'
        ? 200
        : overallStatus === 'degraded'
          ? 200 // Still 200 for degraded, but status indicates issue
          : 503; // Service unavailable

    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('Health check failed:', error);

    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: packageInfo.version,
      checks: {
        ...checks,
        database: {
          status: 'fail',
          message: `Unexpected error: ${error.message}`,
        },
        memory: checks.memory,
      },
    });
  }
}
