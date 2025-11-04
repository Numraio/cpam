# Multi-Tenancy Architecture

## Overview

CPAM implements **hard multi-tenant isolation** using a combination of database constraints and Prisma middleware. All CPAM domain models are strictly scoped to tenants (teams), preventing any possibility of cross-tenant data access.

## Architecture Strategy

### Two-Layer Isolation

1. **Database Layer** (Issue #8 ✅)
   - All CPAM tables have `tenantId` column with FK constraint to `Team.id`
   - Cascade deletes ensure tenant data is fully removed when team is deleted
   - Unique constraints include `tenantId` where needed (e.g., `Item.tenantId + contractId + sku`)

2. **Application Layer** (Issue #3 ✅)
   - Prisma middleware automatically injects `tenantId` into all queries
   - Impossible to accidentally query cross-tenant data
   - Type-safe tenant context throughout the application

### Tenant Model

In CPAM, **tenant = team**. We reuse BoxyHQ's `Team` model as our tenant identifier:
- `Team.id` serves as `tenantId` throughout CPAM models
- Team management (create, delete, members) is handled by BoxyHQ baseline
- CPAM models simply reference `Team.id` for isolation

## Tenant-Scoped Models

All of the following models require tenant scoping:

- `Contract`
- `Item`
- `PAM` (Price Adjustment Mechanism)
- `IndexSeries`
- `IndexValue`
- `CalcBatch`
- `CalcResult`
- `ApprovalEvent`
- `AuditLog`

## Usage

### API Routes

Use `getTenantPrisma()` to get a tenant-scoped Prisma client:

```typescript
import { getTenantPrisma } from '@/lib/prisma-tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query; // Team slug from URL

  // Get tenant ID from slug
  const team = await prisma.team.findUnique({
    where: { slug: slug as string },
    select: { id: true },
  });

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // Get tenant-scoped Prisma client
  const tenantPrisma = getTenantPrisma(team.id);

  // All queries automatically scoped to this tenant
  const items = await tenantPrisma.item.findMany();
  // Returns only items for this tenant

  res.json(items);
}
```

### Using the Wrapper (Recommended)

For cleaner code, use the `withTenantContext` wrapper:

```typescript
import { withTenantContext } from '@/lib/prisma-tenant';

export default withTenantContext(async (req, res, { tenantId, prisma }) => {
  // tenantId and tenant-scoped prisma automatically provided
  const items = await prisma.item.findMany();
  res.json(items);
});
```

### What Gets Auto-Scoped?

The middleware automatically handles:

#### Read Operations
- `findUnique` - adds `where.tenantId`
- `findFirst` - adds `where.tenantId`
- `findMany` - adds `where.tenantId`
- `count` - adds `where.tenantId`
- `aggregate` - adds `where.tenantId`
- `groupBy` - adds `where.tenantId`

#### Write Operations
- `create` - injects `data.tenantId`
- `createMany` - injects `tenantId` into all records
- `update` - adds `where.tenantId`
- `updateMany` - adds `where.tenantId`
- `upsert` - adds `where.tenantId` and `create.tenantId`
- `delete` - adds `where.tenantId`
- `deleteMany` - adds `where.tenantId`

### Example: Creating an Item

```typescript
const tenantPrisma = getTenantPrisma(tenantId);

// You don't need to specify tenantId - it's injected automatically
const item = await tenantPrisma.item.create({
  data: {
    contractId: contract.id,
    sku: 'SKU-12345',
    name: 'Product Name',
    basePrice: 100.0,
    baseCurrency: 'USD',
    uom: 'MT',
    // tenantId is automatically added
  },
});

console.log(item.tenantId); // Equals the tenantId passed to getTenantPrisma()
```

### Example: Querying Items

```typescript
const tenantPrisma = getTenantPrisma(tenantId);

// This query is automatically scoped to tenantId
const activeItems = await tenantPrisma.item.findMany({
  where: {
    contract: {
      status: 'ACTIVE'
    }
  }
});
// Only returns items for this tenant, even though we didn't specify tenantId
```

## System Operations

For system-level operations that need to access all tenants (migrations, seeds, admin tools), use:

### getSystemPrisma()

```typescript
import { getSystemPrisma } from '@/lib/prisma-tenant';

const systemPrisma = getSystemPrisma();

// This bypasses tenant scoping - USE WITH CAUTION
const allContracts = await systemPrisma.contract.findMany();
```

### bypassTenantScope()

For rare cases where you need to bypass scoping in a specific query:

```typescript
import { getTenantPrisma, bypassTenantScope } from '@/lib/prisma-tenant';

const tenantPrisma = getTenantPrisma(tenantId);

// This specific query bypasses tenant scoping
const allItems = await tenantPrisma.item.findMany({
  ...bypassTenantScope(),
  where: { status: 'ACTIVE' }
});
```

**⚠️ WARNING**: Only use bypass for legitimate system operations like:
- Database migrations
- Seed scripts
- Admin dashboards showing cross-tenant metrics
- Data export/backup operations

## Security Guarantees

### What is Prevented

✅ **Cross-tenant reads**: Tenant A cannot read Tenant B's data
```typescript
const tenantAPrisma = getTenantPrisma(tenantA.id);
const contractB = await tenantAPrisma.contract.findUnique({
  where: { id: contractBId } // Tenant B's contract
});
// Returns null (filtered by middleware)
```

✅ **Cross-tenant updates**: Tenant A cannot update Tenant B's data
```typescript
const tenantAPrisma = getTenantPrisma(tenantA.id);
const result = await tenantAPrisma.contract.updateMany({
  where: { id: contractBId }, // Tenant B's contract
  data: { name: 'Hacked' }
});
// result.count === 0 (filtered by middleware)
```

✅ **Cross-tenant deletes**: Tenant A cannot delete Tenant B's data
```typescript
const tenantAPrisma = getTenantPrisma(tenantA.id);
const result = await tenantAPrisma.contract.deleteMany({
  where: { id: contractBId } // Tenant B's contract
});
// result.count === 0 (filtered by middleware)
```

✅ **Accidental cross-tenant creation**: Cannot create data in wrong tenant
```typescript
const tenantAPrisma = getTenantPrisma(tenantA.id);
const item = await tenantAPrisma.item.create({
  data: {
    tenantId: tenantB.id, // Trying to create in Tenant B
    contractId: contractA.id,
    // ...
  }
});
// item.tenantId === tenantA.id (middleware overwrites it)
```

### What is NOT Prevented (Application-Level Checks Required)

❌ **Authorization within tenant**: Middleware doesn't check if USER has access to DATA within their tenant
```typescript
// Middleware ensures user X can only access Tenant A data
// But it doesn't check if user X should access *this specific* contract in Tenant A
// Use RBAC (lib/rbac.ts) for that
```

❌ **Business logic validation**: Middleware doesn't validate business rules
```typescript
// Middleware doesn't check if contract dates are valid
// Middleware doesn't check if PAM graphs are well-formed
// Application code must handle these validations
```

## Testing

### Unit Tests

See `__tests__/lib/prisma-tenant.spec.ts` for comprehensive tests covering:
- Cross-tenant read prevention
- Cross-tenant write prevention
- Automatic tenantId injection
- CreateMany operations
- Upsert operations
- Aggregations and counts
- Bypass mechanism

Run tests:
```bash
npm test -- prisma-tenant.spec.ts
```

### Integration Tests

See `__tests__/database/schema-constraints.spec.ts` for database-level tests covering:
- FK constraints
- Cascade deletes
- Unique constraints with tenantId

## Migration Guide

### Migrating Existing Code

If you have existing code that manually specifies `tenantId`, you can simplify it:

**Before:**
```typescript
const items = await prisma.item.findMany({
  where: {
    tenantId: currentTeam.id,
    contract: { status: 'ACTIVE' }
  }
});
```

**After:**
```typescript
const tenantPrisma = getTenantPrisma(currentTeam.id);
const items = await tenantPrisma.item.findMany({
  where: {
    // No need to specify tenantId - it's automatic
    contract: { status: 'ACTIVE' }
  }
});
```

### BoxyHQ Models (NOT Scoped)

The following BoxyHQ baseline models are **NOT** tenant-scoped:
- `User` - Users can belong to multiple teams
- `TeamMember` - Links users to teams (has teamId but not auto-scoped)
- `Invitation` - Team invitations (has teamId but not auto-scoped)
- `ApiKey` - API keys (has teamId but not auto-scoped)
- `Session`, `Account`, `VerificationToken` - Auth models
- `Subscription`, `Service`, `Price` - Billing models

Use the standard `prisma` client for these:
```typescript
import { prisma } from '@/lib/prisma';

const user = await prisma.user.findUnique({ where: { id: userId } });
const teams = await prisma.teamMember.findMany({ where: { userId } });
```

## Performance Considerations

### Middleware Overhead

- **Minimal**: Middleware adds ~1-2ms per query (negligible)
- **No N+1 queries**: Middleware doesn't execute additional queries
- **No performance regression**: Indexes on `tenantId` columns ensure fast filtering

### Index Strategy

All tenant-scoped tables have indexes including `tenantId`:
- Single indexes: `tenantId`
- Composite indexes: `(tenantId, status)`, `(tenantId, seriesCode)`, etc.
- Ensures PostgreSQL can efficiently filter by tenant

### Query Patterns

**Good** - Leverages tenant index:
```typescript
const items = await tenantPrisma.item.findMany({
  where: { contract: { status: 'ACTIVE' } }
});
// Middleware adds: where.tenantId = '...'
// PostgreSQL uses index on (tenantId, contractId)
```

**Also Good** - Complex queries still fast:
```typescript
const results = await tenantPrisma.calcResult.findMany({
  where: {
    effectiveDate: { gte: startDate, lte: endDate },
    item: { contract: { status: 'ACTIVE' } }
  },
  include: { item: true, batch: true }
});
// Middleware adds tenantId to root where clause
// All FK traversals are within same tenant (guaranteed by DB constraints)
```

## Troubleshooting

### Error: "tenantId is required"

```typescript
const prisma = getTenantPrisma(''); // ❌ Empty string
const prisma = getTenantPrisma(undefined); // ❌ Undefined
```

**Solution**: Always pass a valid tenantId:
```typescript
const prisma = getTenantPrisma(team.id); // ✅
```

### Query returns no results unexpectedly

**Check**: Are you using the correct tenant Prisma client?
```typescript
const tenantAPrisma = getTenantPrisma(tenantA.id);
const contractB = await tenantAPrisma.contract.findUnique({
  where: { id: contractBId } // Belongs to Tenant B
});
// Returns null - this is CORRECT behavior
```

### Need to query across tenants

**Use system Prisma**:
```typescript
import { getSystemPrisma } from '@/lib/prisma-tenant';

const systemPrisma = getSystemPrisma();
const allContracts = await systemPrisma.contract.findMany({
  where: { status: 'ACTIVE' }
});
// Returns contracts from ALL tenants
```

## Related Documentation

- [Database ERD](./database/ERD.md) - Schema design with tenantId columns
- [RBAC](../lib/rbac.ts) - Role-based access control within tenants
- [BoxyHQ Teams](https://boxyhq.com/docs/jackson/overview) - Team management baseline

## Related Issues

- [Issue #3](https://github.com/Numraio/cpam/issues/3) - Multi-tenancy implementation (this document)
- [Issue #8](https://github.com/Numraio/cpam/issues/8) - Core data model with tenantId columns
- [Issue #2](https://github.com/Numraio/cpam/issues/2) - AuthN/SSO/SCIM with role enforcement

## Future Enhancements

### Planned (Not Yet Implemented)

- **Tenant-level feature flags**: Enable/disable features per tenant
- **Tenant-level quotas**: Enforce item limits, storage limits per tenant
- **Tenant-level rate limiting**: Prevent abuse at tenant level
- **Data residency**: Pin tenant data to specific regions (Issue #30)
- **Tenant isolation metrics**: Track and alert on cross-tenant access attempts
- **Tenant deletion workflow**: Soft delete with grace period before hard delete
