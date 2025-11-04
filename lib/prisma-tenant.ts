/**
 * Tenant-Scoped Prisma Client
 *
 * Provides automatic tenant isolation for all CPAM domain models via Prisma middleware.
 * All queries for CPAM models must include tenantId in the where clause, or be explicitly
 * bypassed using the bypass mechanism for system operations.
 *
 * Usage:
 *   import { getTenantPrisma } from '@/lib/prisma-tenant';
 *
 *   const prisma = getTenantPrisma(tenantId);
 *   const items = await prisma.item.findMany(); // Automatically scoped to tenantId
 */

import { Prisma, PrismaClient } from '@prisma/client';

// Models that require tenant scoping
const TENANT_SCOPED_MODELS = [
  'contract',
  'item',
  'pAM',
  'indexSeries',
  'indexValue',
  'calcBatch',
  'calcResult',
  'approvalEvent',
  'auditLog',
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

// Symbol to mark queries that should bypass tenant scoping (for system operations)
const BYPASS_TENANT_SCOPE = Symbol('bypassTenantScope');

interface TenantScopeBypass {
  [BYPASS_TENANT_SCOPE]?: boolean;
}

/**
 * Creates a tenant-scoped Prisma client that automatically injects tenantId
 * into all queries for CPAM domain models.
 *
 * @param tenantId - The tenant ID to scope queries to
 * @returns A Prisma client instance with tenant middleware applied
 */
export function getTenantPrisma(tenantId: string): PrismaClient {
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped Prisma client');
  }

  const prisma = new PrismaClient();

  // Apply middleware for automatic tenant scoping
  prisma.$use(async (params, next) => {
    const model = params.model?.toLowerCase() as TenantScopedModel;

    // Only apply to tenant-scoped models
    if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
      return next(params);
    }

    // Check if this query explicitly bypasses tenant scope
    const bypass = (params.args as any)?.[BYPASS_TENANT_SCOPE];
    if (bypass) {
      // Remove the bypass marker before executing
      delete (params.args as any)[BYPASS_TENANT_SCOPE];
      return next(params);
    }

    // Inject tenantId into where clause
    switch (params.action) {
      case 'findUnique':
      case 'findFirst':
      case 'findMany':
      case 'count':
      case 'aggregate':
      case 'groupBy':
      case 'findFirstOrThrow':
      case 'findUniqueOrThrow':
        // Add tenantId to where clause
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
        break;

      case 'create':
        // Inject tenantId into create data
        params.args = params.args || {};
        params.args.data = params.args.data || {};
        params.args.data.tenantId = tenantId;
        break;

      case 'createMany':
        // Inject tenantId into all create records
        params.args = params.args || {};
        params.args.data = params.args.data || [];
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((record) => ({
            ...record,
            tenantId,
          }));
        } else {
          params.args.data.tenantId = tenantId;
        }
        break;

      case 'update':
      case 'updateMany':
      case 'delete':
      case 'deleteMany':
      case 'upsert':
        // Add tenantId to where clause for updates/deletes
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;

        // For upsert, also inject into create data
        if (params.action === 'upsert' && params.args.create) {
          params.args.create.tenantId = tenantId;
        }
        break;
    }

    return next(params);
  });

  return prisma;
}

/**
 * Creates a Prisma client that bypasses tenant scoping.
 * USE WITH EXTREME CAUTION - only for system operations, migrations, seeds, etc.
 *
 * @returns A standard Prisma client without tenant middleware
 */
export function getSystemPrisma(): PrismaClient {
  return new PrismaClient();
}

/**
 * Marks a query to bypass tenant scoping.
 * This should ONLY be used for system operations where cross-tenant access is required.
 *
 * Example:
 *   const allItems = await prisma.item.findMany({
 *     ...bypassTenantScope(),
 *     where: { status: 'ACTIVE' }
 *   });
 */
export function bypassTenantScope(): TenantScopeBypass {
  return { [BYPASS_TENANT_SCOPE]: true };
}

/**
 * Helper to extract tenantId from team slug via API request
 * This integrates with the existing BoxyHQ team infrastructure
 */
export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  const { prisma } = await import('./prisma');

  const team = await prisma.team.findUnique({
    where: { slug },
    select: { id: true },
  });

  return team?.id || null;
}

/**
 * Helper to extract tenantId from session
 * Gets the first team the user belongs to, or throws an error
 */
export async function getTenantIdFromSession(
  userId: string,
  teamSlug?: string
): Promise<string> {
  const { prisma } = await import('./prisma');

  if (teamSlug) {
    // Get specific team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { slug: teamSlug },
      },
      include: {
        team: { select: { id: true } },
      },
    });

    if (!teamMember) {
      throw new Error(`User does not have access to team: ${teamSlug}`);
    }

    return teamMember.team.id;
  }

  // Get first team user belongs to
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId },
    include: {
      team: { select: { id: true } },
    },
  });

  if (!teamMember) {
    throw new Error('User is not a member of any team');
  }

  return teamMember.team.id;
}

/**
 * Type-safe wrapper for tenant-scoped queries
 * Ensures tenantId is always provided at compile time
 */
export interface TenantContext {
  tenantId: string;
}

/**
 * Higher-order function to wrap API handlers with tenant context
 * Automatically extracts tenantId from request and provides tenant-scoped Prisma client
 *
 * Example:
 *   export default withTenantContext(async (req, res, { tenantId, prisma }) => {
 *     const items = await prisma.item.findMany(); // Automatically scoped
 *     res.json(items);
 *   });
 */
export function withTenantContext<T = any>(
  handler: (
    req: any,
    res: any,
    context: { tenantId: string; prisma: PrismaClient }
  ) => Promise<T>
) {
  return async (req: any, res: any): Promise<T> => {
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      throw new Error('Team slug is required');
    }

    const tenantId = await getTenantIdFromSlug(slug);

    if (!tenantId) {
      throw new Error(`Team not found: ${slug}`);
    }

    const prisma = getTenantPrisma(tenantId);

    try {
      return await handler(req, res, { tenantId, prisma });
    } finally {
      await prisma.$disconnect();
    }
  };
}
