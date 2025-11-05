# Audit Logging

Append-only audit logging system with correlation IDs, PII masking, and domain events.

## Overview

The audit logging system provides:
- **Append-only storage**: Immutable audit trail
- **Correlation IDs**: Group related events across a workflow
- **PII masking**: Automatic masking of sensitive fields
- **Domain events**: Typed helpers for common actions
- **Query API**: Flexible querying with filters and pagination
- **Multi-tenant**: Tenant-isolated audit logs

## Basic Usage

### Logging an Event

```typescript
import { logAuditEvent, type AuditContext } from '@/lib/audit/audit-logger';

const context: AuditContext = {
  tenantId: 'tenant-123',
  userId: 'user-456',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
};

const entry = await logAuditEvent(prisma, context, {
  action: 'CREATE',
  entityType: 'CONTRACT',
  entityId: 'contract-789',
  changes: {
    after: {
      name: 'Q4 2024 Oil Contract',
      status: 'DRAFT',
    },
  },
});

console.log(`Audit entry created: ${entry.id}`);
```

### Using Correlation IDs

Group related events across a workflow:

```typescript
import { generateCorrelationId, logAuditEvent } from '@/lib/audit/audit-logger';

// Generate correlation ID at workflow start
const correlationId = generateCorrelationId();

const context: AuditContext = {
  tenantId,
  userId,
  correlationId, // Same ID for all related events
};

// Log workflow steps
await logAuditEvent(prisma, context, {
  action: 'CREATE',
  entityType: 'CALC_BATCH',
  entityId: batchId,
});

await logAuditEvent(prisma, context, {
  action: 'CALCULATE',
  entityType: 'CALC_BATCH',
  entityId: batchId,
  metadata: { itemsProcessed: 100 },
});

await logAuditEvent(prisma, context, {
  action: 'APPROVE',
  entityType: 'CALC_BATCH',
  entityId: batchId,
});

// Later: retrieve all related events
const workflow = await getRelatedEvents(prisma, tenantId, correlationId);
// Returns: [CREATE, CALCULATE, APPROVE] events
```

## Domain Events

Pre-built helpers for common actions.

### Approval Events

```typescript
import { logApproval } from '@/lib/audit/audit-logger';

await logApproval(prisma, context, batchId, 'Approved for production');
```

### Override Events

```typescript
import { logOverride } from '@/lib/audit/audit-logger';

await logOverride(
  prisma,
  context,
  resultId,
  100, // original price
  110, // override price
  'Contract negotiation - 10% premium agreed'
);
```

### CRUD Events

```typescript
import { logCreate, logUpdate, logDelete } from '@/lib/audit/audit-logger';

// Create
await logCreate(prisma, context, 'CONTRACT', contractId, {
  name: 'New Contract',
  status: 'DRAFT',
});

// Update
await logUpdate(prisma, context, 'CONTRACT', contractId,
  { status: 'DRAFT' }, // before
  { status: 'ACTIVE' } // after
);

// Delete
await logDelete(prisma, context, 'CONTRACT', contractId, {
  name: 'Deleted Contract',
});
```

### Calculation Events

```typescript
import { logCalculation } from '@/lib/audit/audit-logger';

await logCalculation(prisma, context, batchId, {
  itemsProcessed: 100,
  itemsSucceeded: 98,
  itemsFailed: 2,
});
```

### Import/Export Events

```typescript
import { logImport, logExport } from '@/lib/audit/audit-logger';

// Import
await logImport(prisma, context, 'CONTRACT', {
  filename: 'contracts.csv',
  rowsProcessed: 50,
  rowsSucceeded: 48,
  rowsFailed: 2,
});

// Export
await logExport(prisma, context, 'CALC_BATCH', batchId, {
  format: 'csv',
  filename: 'approved_prices.csv',
  rowCount: 100,
});
```

## Querying Audit Logs

### Basic Query

```typescript
import { queryAuditLogs } from '@/lib/audit/audit-logger';

const result = await queryAuditLogs(prisma, {
  tenantId: 'tenant-123',
  page: 1,
  pageSize: 50,
});

console.log(`Total entries: ${result.total}`);
console.log(`Total pages: ${result.totalPages}`);

result.entries.forEach((entry) => {
  console.log(`${entry.createdAt}: ${entry.action} ${entry.entityType} ${entry.entityId}`);
});
```

### Filter by Entity

```typescript
const result = await queryAuditLogs(prisma, {
  tenantId,
  entityType: 'CALC_BATCH',
  entityId: 'batch-123',
});
```

### Filter by Action

```typescript
const result = await queryAuditLogs(prisma, {
  tenantId,
  action: 'APPROVE',
});
```

### Filter by Date Range

```typescript
const result = await queryAuditLogs(prisma, {
  tenantId,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

### Get Entity History

```typescript
import { getEntityAuditTrail } from '@/lib/audit/audit-logger';

const trail = await getEntityAuditTrail(
  prisma,
  tenantId,
  'CONTRACT',
  'contract-123'
);

// Returns all events for this contract, ordered chronologically
trail.forEach((entry) => {
  console.log(`${entry.createdAt}: ${entry.action}`);
});
```

### Get Related Events

```typescript
import { getRelatedEvents } from '@/lib/audit/audit-logger';

const workflow = await getRelatedEvents(prisma, tenantId, correlationId);

console.log(`Workflow has ${workflow.length} events`);
```

## PII Masking

Automatic masking of sensitive fields.

### Masked Fields

The following field names are automatically masked:
- email
- phone / phoneNumber
- ssn
- taxId
- creditCard
- password
- apiKey
- secret
- token

### Example

```typescript
const data = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234-5678',
  price: 100.50,
};

// Logged as:
{
  name: 'John Doe', // Not masked
  email: 'jo**********om', // Masked
  phone: '55********78', // Masked
  price: 100.50, // Not masked
}
```

### Nested Objects

PII masking works recursively:

```typescript
const data = {
  contract: {
    counterparty: {
      name: 'Acme Corp',
      email: 'contact@acme.com',
    },
  },
  metadata: {
    apiKey: 'secret-key-12345',
  },
};

// Masked:
{
  contract: {
    counterparty: {
      name: 'Acme Corp',
      email: 'co**********om', // Masked
    },
  },
  metadata: {
    apiKey: 'se*******45', // Masked
  },
}
```

### Manual Masking

```typescript
import { maskPII } from '@/lib/audit/audit-logger';

const data = { email: 'sensitive@example.com' };
const masked = maskPII(data);

console.log(masked.email); // 'se***************om'
```

## Integration with Existing Services

### Approval Workflow

The approval workflow already integrates audit logging:

```typescript
// From lib/approvals/batch-approvals.ts
await prisma.auditLog.create({
  data: {
    tenantId,
    userId,
    action: 'APPROVE',
    entityType: 'CALC_BATCH',
    entityId: batchId,
    changes: {
      status: 'APPROVED',
      approvedBy: userId,
      comments: updated.comments,
    },
  },
});
```

### Calculation Orchestrator

Add correlation IDs to batch calculations:

```typescript
import { generateCorrelationId } from '@/lib/audit/audit-logger';

const correlationId = generateCorrelationId();

// Pass through calculation workflow
const context = {
  tenantId,
  userId,
  correlationId,
};

await logCalculation(prisma, context, batchId);
```

### CSV Import/Export

Log bulk operations:

```typescript
import { logImport, logExport } from '@/lib/audit/audit-logger';

// After import
await logImport(prisma, context, 'CONTRACT', {
  filename: 'contracts.csv',
  totalRows: result.totalRows,
  successCount: result.successCount,
  errorCount: result.errorCount,
});

// Before export
await logExport(prisma, context, 'CALC_BATCH', batchId, {
  format: 'csv',
  rowCount: results.length,
});
```

## Schema

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String
  action        String // CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
  entityType    String // CONTRACT, ITEM, PAM, CALC_BATCH, etc.
  entityId      String
  correlationId String? // Groups related events
  changes       Json? // Before/after state (PII-masked)
  metadata      Json? // Additional context
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([entityType, entityId])
  @@index([correlationId])
  @@index([createdAt])
  @@index([action])
}
```

## API Endpoints

### Get Audit Trail

```typescript
// pages/api/audit/[entityType]/[entityId].ts
export default async function handler(req, res) {
  const { entityType, entityId } = req.query;
  const session = await getSession({ req });

  const trail = await getEntityAuditTrail(
    prisma,
    session.user.teamId,
    entityType as AuditEntityType,
    entityId as string
  );

  return res.json(trail);
}
```

### Search Audit Logs

```typescript
// pages/api/audit/search.ts
export default async function handler(req, res) {
  const session = await getSession({ req });
  const { action, entityType, startDate, endDate, page } = req.query;

  const result = await queryAuditLogs(prisma, {
    tenantId: session.user.teamId,
    action: action as AuditAction,
    entityType: entityType as AuditEntityType,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page: page ? parseInt(page) : 1,
  });

  return res.json(result);
}
```

## UI Components

### Audit Trail Component

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function AuditTrail({ entityType, entityId }: Props) {
  const [trail, setTrail] = useState([]);

  useEffect(() => {
    fetch(`/api/audit/${entityType}/${entityId}`)
      .then((res) => res.json())
      .then(setTrail);
  }, [entityType, entityId]);

  return (
    <div className="space-y-2">
      <h3 className="font-bold">Audit Trail</h3>
      <div className="timeline">
        {trail.map((entry) => (
          <div key={entry.id} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <div className="text-sm font-semibold">{entry.action}</div>
              <div className="text-xs text-base-content/60">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div className="text-xs">By: {entry.userId}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always use correlation IDs** for workflows
2. **Log at critical points**: create, approve, override, export
3. **Include meaningful metadata**: user comments, error messages, counts
4. **Never modify audit logs**: Append-only
5. **Query with filters**: Use specific filters to reduce data transfer
6. **Regular exports**: Export audit logs periodically for compliance
7. **Monitor PII fields**: Review masked fields regularly

## Compliance

### Immutability

Audit logs are append-only. No update or delete operations are provided.

### Retention

Audit logs are retained indefinitely. Implement archival strategy based on compliance requirements.

### Access Control

Audit log access should be restricted to authorized personnel only.

### PII Protection

All PII fields are automatically masked before storage.

## Testing

Run tests:
```bash
pnpm test audit-logger
```

Acceptance tests verify:
- ✓ Approval audit records include actor/time/entity
- ✓ Override reasons are persisted and immutable
- ✓ Correlation ID returns all related events

## Related Documentation

- [Approvals Workflow](./approvals-workflow.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
- [CSV Import/Export](./csv-import-export.md)
