/**
 * Tests for Health Check Endpoint
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/health';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    calcBatch: {
      count: jest.fn(),
    },
    indexValue: {
      findFirst: jest.fn(),
    },
  },
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Health Check', () => {
    it('returns healthy status when all checks pass', async () => {
      // Mock database response
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.status).toBe('healthy');
      expect(data.checks.database.status).toBe('pass');
      expect(data.checks.memory.status).toBe('pass');
      expect(data.version).toBeDefined();
      expect(data.uptime).toBeGreaterThan(0);
      expect(data.timestamp).toBeDefined();
    });

    it('returns 503 when database check fails', async () => {
      // Mock database failure
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      );

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      const data = JSON.parse(res._getData());

      expect(data.status).toBe('unhealthy');
      expect(data.checks.database.status).toBe('fail');
      expect(data.checks.database.message).toContain('Connection refused');
    });

    it('returns 405 for non-GET methods', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Database Performance', () => {
    it('marks database as warn when response is slow', async () => {
      // Mock slow database response
      (prisma.$queryRaw as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ '?column?': 1 }]), 300)
          )
      );

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.status).toBe('degraded');
      expect(data.checks.database.status).toBe('warn');
      expect(data.checks.database.responseTime).toBeGreaterThan(100);
    });

    it('marks database as fail when response is very slow', async () => {
      // Mock very slow database response
      (prisma.$queryRaw as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ '?column?': 1 }]), 600)
          )
      );

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      const data = JSON.parse(res._getData());

      expect(data.status).toBe('unhealthy');
      expect(data.checks.database.status).toBe('fail');
      expect(data.checks.database.responseTime).toBeGreaterThan(500);
    });
  });

  describe('Memory Health', () => {
    it('includes memory usage metrics', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.checks.memory.status).toBe('pass');
      expect(data.checks.memory.details).toBeDefined();
      expect(data.checks.memory.details.heapUsed).toBeGreaterThan(0);
      expect(data.checks.memory.details.heapTotal).toBeGreaterThan(0);
      expect(data.checks.memory.details.heapUsagePercent).toBeDefined();
    });

    it('marks memory as warn when usage is high (simulated)', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 85 * 1024 * 1024, // 85% usage
        external: 1 * 1024 * 1024,
        arrayBuffers: 0,
      }));

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      expect(data.checks.memory.status).toBe('warn');
      expect(data.status).toBe('degraded');

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Detailed Health Check', () => {
    it('includes additional details when detailed=true', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (prisma.calcBatch.count as jest.Mock).mockResolvedValue(42);
      (prisma.indexValue.findFirst as jest.Mock).mockResolvedValue({
        ingestedAt: new Date('2023-01-01T12:00:00Z'),
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          detailed: 'true',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.details).toBeDefined();
      expect(data.details.queueDepth).toBe(42);
      expect(data.details.lastIngestion).toBe('2023-01-01T12:00:00.000Z');
    });

    it('does not include details when detailed=false', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          detailed: 'false',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.details).toBeUndefined();
    });

    it('handles errors in optional details gracefully', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      (prisma.calcBatch.count as jest.Mock).mockRejectedValue(
        new Error('Table not found')
      );

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          detailed: 'true',
        },
      });

      await handler(req, res);

      // Should still return healthy since main checks passed
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      expect(data.status).toBe('healthy');
      // Details may be undefined or partial
    });
  });

  describe('Response Format', () => {
    it('includes all required fields', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      // Required fields
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('checks');

      // Checks structure
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('memory');

      // Check status fields
      expect(data.checks.database).toHaveProperty('status');
      expect(['pass', 'warn', 'fail']).toContain(data.checks.database.status);
    });

    it('timestamp is valid ISO 8601', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });
});

describe('Acceptance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Given healthy system, then health check returns 200', async () => {
    // Scenario: All systems operational
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('healthy');
  });

  it('Given database down, then health check returns 503', async () => {
    // Scenario: Database connection failure
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED')
    );

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(503);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('fail');
  });

  it('Given slow database, then health check returns degraded', async () => {
    // Scenario: Database responding but slow
    (prisma.$queryRaw as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve([{ '?column?': 1 }]), 300)
        )
    );

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.status).toBe('degraded');
    expect(data.checks.database.status).toBe('warn');
  });

  it('Given load balancer check, then health responds quickly', async () => {
    // Scenario: Load balancer needs fast health check
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const startTime = Date.now();
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    const duration = Date.now() - startTime;

    expect(res._getStatusCode()).toBe(200);
    expect(duration).toBeLessThan(1000); // Should respond within 1 second
  });

  it('Given monitoring system, then detailed health includes metrics', async () => {
    // Scenario: Prometheus/monitoring needs detailed metrics
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    (prisma.calcBatch.count as jest.Mock).mockResolvedValue(150);
    (prisma.indexValue.findFirst as jest.Mock).mockResolvedValue({
      ingestedAt: new Date(),
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { detailed: 'true' },
    });

    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.details).toBeDefined();
    expect(data.details.queueDepth).toBe(150);
    expect(data.details.lastIngestion).toBeDefined();
  });
});
