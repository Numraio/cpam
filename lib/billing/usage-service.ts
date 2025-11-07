/**
 * Usage Service
 *
 * Tracks Items under Management (IuM) and enforces plan limits.
 */

import { prisma } from '@/lib/prisma';

/**
 * Get current usage for a tenant
 */
export async function getTeamUsage(tenantId: string): Promise<{
  itemsUnderManagement: number;
  lastUpdated: Date | null;
}> {
  const team = await prisma.team.findUnique({
    where: { id: tenantId },
    select: {
      itemsUnderManagement: true,
      usageLastUpdated: true,
    },
  });

  if (!team) {
    throw new Error(`Team not found: ${tenantId}`);
  }

  return {
    itemsUnderManagement: team.itemsUnderManagement,
    lastUpdated: team.usageLastUpdated,
  };
}

/**
 * Recalculate usage by counting items directly
 * (for verification/reconciliation)
 */
export async function recalculateUsage(tenantId: string): Promise<number> {
  const count = await prisma.item.count({
    where: { tenantId },
  });

  await prisma.team.update({
    where: { id: tenantId },
    data: {
      itemsUnderManagement: count,
      usageLastUpdated: new Date(),
    },
  });

  return count;
}

/**
 * Increment usage counter (called on item creation)
 */
export async function incrementUsage(tenantId: string): Promise<number> {
  const team = await prisma.team.update({
    where: { id: tenantId },
    data: {
      itemsUnderManagement: {
        increment: 1,
      },
      usageLastUpdated: new Date(),
    },
    select: {
      itemsUnderManagement: true,
    },
  });

  return team.itemsUnderManagement;
}

/**
 * Decrement usage counter (called on item deletion)
 */
export async function decrementUsage(tenantId: string): Promise<number> {
  const team = await prisma.team.update({
    where: { id: tenantId },
    data: {
      itemsUnderManagement: {
        decrement: 1,
      },
      usageLastUpdated: new Date(),
    },
    select: {
      itemsUnderManagement: true,
    },
  });

  return team.itemsUnderManagement;
}

/**
 * Get entitlements for a tenant
 */
export async function getTeamEntitlements(tenantId: string): Promise<{
  maxItemsUnderManagement: number | null; // null = unlimited
  planName: string | null;
  active: boolean;
}> {
  const team = await prisma.team.findUnique({
    where: { id: tenantId },
    select: { billingId: true },
  });

  if (!team?.billingId) {
    // No billing set up = free tier with default limit
    return {
      maxItemsUnderManagement: getDefaultIuMLimit(),
      planName: 'Free',
      active: true,
    };
  }

  // Get active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      customerId: team.billingId,
      active: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!subscription) {
    // No active subscription = free tier
    return {
      maxItemsUnderManagement: getDefaultIuMLimit(),
      planName: 'Free',
      active: true,
    };
  }

  return {
    maxItemsUnderManagement: subscription.maxItemsUnderManagement,
    planName: subscription.priceId, // TODO: Map priceId to plan name
    active: subscription.active,
  };
}

/**
 * Check if tenant can create a new item (plan gate)
 */
export async function canCreateItem(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usage?: {
    current: number;
    limit: number | null;
  };
}> {
  const [usage, entitlements] = await Promise.all([
    getTeamUsage(tenantId),
    getTeamEntitlements(tenantId),
  ]);

  // Unlimited plan
  if (entitlements.maxItemsUnderManagement === null) {
    return { allowed: true };
  }

  // Check if at limit
  if (usage.itemsUnderManagement >= entitlements.maxItemsUnderManagement) {
    return {
      allowed: false,
      reason: `You've reached your plan limit of ${entitlements.maxItemsUnderManagement} items. Please upgrade to add more items.`,
      usage: {
        current: usage.itemsUnderManagement,
        limit: entitlements.maxItemsUnderManagement,
      },
    };
  }

  return {
    allowed: true,
    usage: {
      current: usage.itemsUnderManagement,
      limit: entitlements.maxItemsUnderManagement,
    },
  };
}

/**
 * Get default IuM limit for free tier
 * (can be overridden with env var)
 */
function getDefaultIuMLimit(): number {
  const envLimit = process.env.DEFAULT_IUM_LIMIT;
  return envLimit ? parseInt(envLimit, 10) : 100; // Default: 100 items
}
