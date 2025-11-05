### Approval Workflow

Manages approval lifecycle for calculation batches with state machine, immutability, and override support.

## Overview

The approval workflow provides:
- **State machine**: PENDING → APPROVED | REJECTED
- **Immutability**: Approved values cannot be edited (only overridden)
- **Override support**: Manual price adjustments with reason and audit trail
- **Server-side validation**: All transitions validated
- **Audit logging**: Complete history of approvals and overrides

## State Machine

```
┌─────────┐
│  null   │ (no approval)
└────┬────┘
     │ requestBatchApproval()
     ▼
┌─────────┐
│ PENDING │
└────┬────┘
     │
     ├─────────────────────┐
     │                     │
     │ approveBatch()      │ rejectBatch()
     ▼                     ▼
┌──────────┐          ┌──────────┐
│ APPROVED │          │ REJECTED │
└──────────┘          └────┬─────┘
(terminal)                 │
                          │ requestBatchApproval()
                          │ (re-request)
                          ▼
                     ┌─────────┐
                     │ PENDING │
                     └─────────┘
```

### Valid Transitions

| From     | To       | Function              | Notes                    |
|----------|----------|-----------------------|--------------------------|
| null     | PENDING  | requestBatchApproval  | Initial approval request |
| PENDING  | APPROVED | approveBatch          | Marks results immutable  |
| PENDING  | REJECTED | rejectBatch           | Requires reason          |
| REJECTED | PENDING  | requestBatchApproval  | Re-request after changes |
| APPROVED | —        | —                     | Terminal state           |

### Invalid Transitions

- APPROVED → PENDING (cannot unapprove)
- APPROVED → REJECTED (cannot reject after approval)
- null → APPROVED (must go through PENDING)
- null → REJECTED (must go through PENDING)

## API

### Request Approval

Creates a pending approval request for a completed batch.

```typescript
import { requestBatchApproval } from '@/lib/approvals/batch-approvals';

const result = await requestBatchApproval(prisma, {
  tenantId: 'tenant-123',
  batchId: 'batch-456',
  userId: 'user-789',
  comments: 'Please review Q4 pricing adjustments',
});

console.log(result.approvalId); // 'approval-xyz'
console.log(result.status); // 'PENDING'
```

**Requirements:**
- Batch must be in `COMPLETED` status
- Batch must have results
- No existing `PENDING` or `APPROVED` approval

**Creates:**
- ApprovalEvent (status=PENDING)
- AuditLog entry (action=REQUEST_APPROVAL)

### Approve Batch

Approves a pending batch, making all results immutable.

```typescript
import { approveBatch } from '@/lib/approvals/batch-approvals';

const result = await approveBatch(prisma, {
  tenantId: 'tenant-123',
  batchId: 'batch-456',
  userId: 'user-789',
  comments: 'Approved for production use',
});

console.log(result.status); // 'APPROVED'
console.log(result.approvedBy); // 'user-789'
console.log(result.approvedAt); // Date
```

**Requirements:**
- Pending approval must exist
- Batch must still be in `COMPLETED` status

**Effects:**
- Updates ApprovalEvent (status=APPROVED)
- Marks all CalcResults as approved (isApproved=true)
- Creates AuditLog entry (action=APPROVE)
- Results become immutable (can only be changed via override)

### Reject Batch

Rejects a pending batch.

```typescript
import { rejectBatch } from '@/lib/approvals/batch-approvals';

const result = await rejectBatch(prisma, {
  tenantId: 'tenant-123',
  batchId: 'batch-456',
  userId: 'user-789',
  reason: 'Prices are 10% too high compared to market rates',
});

console.log(result.status); // 'REJECTED'
console.log(result.rejectedBy); // 'user-789'
console.log(result.comments); // Rejection reason
```

**Requirements:**
- Pending approval must exist
- Reason is required (non-empty string)

**Effects:**
- Updates ApprovalEvent (status=REJECTED)
- Creates AuditLog entry (action=REJECT)
- Results remain unapproved
- Can request approval again after fixing issues

### Override Approved Price

Manually overrides an approved price with reason and audit trail.

```typescript
import { overrideApprovedPrice } from '@/lib/approvals/batch-approvals';

const result = await overrideApprovedPrice(prisma, {
  tenantId: 'tenant-123',
  batchId: 'batch-456',
  itemId: 'item-123',
  userId: 'user-789',
  overridePrice: 125.50,
  reason: 'Contract negotiation - agreed to 5% premium',
});

console.log(result.originalPrice); // 115.00 (from calculation)
console.log(result.overridePrice); // 125.50 (manual override)
console.log(result.reason); // Override reason
```

**Requirements:**
- Batch must be approved
- Result must be approved (isApproved=true)
- Reason is required (non-empty string)

**Effects:**
- Preserves originalCalculatedPrice (if first override)
- Updates adjustedPrice to override value
- Marks result as overridden (isOverridden=true)
- Stores reason and metadata
- Creates AuditLog entry (action=OVERRIDE)

**Immutability:**
- Original calculated price is preserved across multiple overrides
- Each override creates new audit entry
- Full history maintained in audit log

### Get Approval Status

Retrieves current approval status for a batch.

```typescript
import { getBatchApprovalStatus } from '@/lib/approvals/batch-approvals';

const status = await getBatchApprovalStatus(prisma, 'tenant-123', 'batch-456');

if (status) {
  console.log(status.status); // 'APPROVED' | 'PENDING' | 'REJECTED'
  console.log(status.approvedBy); // User ID if approved
  console.log(status.approvedAt); // Date if approved
}
```

Returns `null` if no approval exists.

### List Overrides

Lists all overrides for a batch.

```typescript
import { listBatchOverrides } from '@/lib/approvals/batch-approvals';

const overrides = await listBatchOverrides(prisma, 'tenant-123', 'batch-456');

overrides.forEach((override) => {
  console.log(override.itemId); // Item that was overridden
  console.log(override.originalPrice); // Calculated price
  console.log(override.overridePrice); // Manual override
  console.log(override.reason); // Why it was overridden
  console.log(override.overriddenBy); // User who overrode
  console.log(override.overriddenAt); // When overridden
});
```

### Validate Transition

Server-side validation of state transitions.

```typescript
import { isValidTransition } from '@/lib/approvals/batch-approvals';

const valid = isValidTransition('PENDING', 'APPROVED'); // true
const invalid = isValidTransition('APPROVED', 'REJECTED'); // false
```

## Database Schema

### CalcResult Fields

```prisma
model CalcResult {
  // ... existing fields ...

  // Approval fields
  isApproved  Boolean   @default(false)
  approvedBy  String?
  approvedAt  DateTime?

  // Override fields
  isOverridden             Boolean   @default(false)
  originalCalculatedPrice  Decimal?  @db.Decimal(20, 12)
  overrideReason           String?   @db.Text
  overriddenBy             String?
  overriddenAt             DateTime?

  @@index([isApproved])
  @@index([isOverridden])
}
```

### ApprovalEvent

```prisma
model ApprovalEvent {
  id         String         @id @default(uuid())
  tenantId   String
  entityType String // "CALC_BATCH", "CONTRACT", "PAM"
  entityId   String // Batch ID
  status     ApprovalStatus @default(PENDING)
  approvedBy String?
  rejectedBy String?
  comments   String?        @db.Text
  approvedAt DateTime?
  rejectedAt DateTime?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([tenantId])
  @@index([entityType, entityId])
  @@index([status])
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### AuditLog

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String
  userId     String
  action     String // "REQUEST_APPROVAL", "APPROVE", "REJECT", "OVERRIDE"
  entityType String // "CALC_BATCH", "CALC_RESULT"
  entityId   String
  changes    Json
  createdAt  DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([entityType, entityId])
  @@index([action])
}
```

## Complete Example

### Approval Flow

```typescript
import {
  requestBatchApproval,
  approveBatch,
  getBatchApprovalStatus,
} from '@/lib/approvals/batch-approvals';

// 1. Calculation completes
const batchResult = await executeCalculationBatch(prisma, batchId);
console.log(batchResult.status); // 'COMPLETED'

// 2. Request approval
const approvalRequest = await requestBatchApproval(prisma, {
  tenantId,
  batchId,
  userId: calculatorUserId,
  comments: 'Q4 2024 pricing - ready for review',
});
console.log(approvalRequest.status); // 'PENDING'

// 3. Reviewer checks status
const status = await getBatchApprovalStatus(prisma, tenantId, batchId);
console.log(status?.status); // 'PENDING'

// 4. Reviewer approves
const approved = await approveBatch(prisma, {
  tenantId,
  batchId,
  userId: approverUserId,
  comments: 'Reviewed and approved',
});
console.log(approved.status); // 'APPROVED'

// 5. Results are now immutable
const results = await getBatchResults(prisma, batchId);
results.results.forEach((r) => {
  console.log(r.isApproved); // true
  // Cannot edit adjustedPrice directly anymore
});
```

### Override Flow

```typescript
import {
  overrideApprovedPrice,
  listBatchOverrides,
} from '@/lib/approvals/batch-approvals';

// 1. Override specific item
const override = await overrideApprovedPrice(prisma, {
  tenantId,
  batchId,
  itemId: 'item-123',
  userId: managerUserId,
  overridePrice: 125.50,
  reason: 'Customer contract negotiation - agreed to 5% premium',
});

console.log(override.originalPrice); // 115.00
console.log(override.overridePrice); // 125.50

// 2. List all overrides for batch
const overrides = await listBatchOverrides(prisma, tenantId, batchId);
console.log(`${overrides.length} items overridden`);

overrides.forEach((o) => {
  const delta = o.overridePrice - o.originalPrice;
  const pct = (delta / o.originalPrice) * 100;
  console.log(`Item ${o.itemId}: ${delta >= 0 ? '+' : ''}${pct.toFixed(1)}% (${o.reason})`);
});
```

### Rejection and Re-request Flow

```typescript
import {
  rejectBatch,
  requestBatchApproval,
} from '@/lib/approvals/batch-approvals';

// 1. Reviewer rejects
const rejected = await rejectBatch(prisma, {
  tenantId,
  batchId,
  userId: approverUserId,
  reason: 'Prices are 10% above market rates - please recalculate with current Brent prices',
});
console.log(rejected.status); // 'REJECTED'

// 2. Fix calculations (re-run batch)
await executeCalculationBatch(prisma, batchId);

// 3. Re-request approval
const resubmitted = await requestBatchApproval(prisma, {
  tenantId,
  batchId,
  userId: calculatorUserId,
  comments: 'Recalculated with 12/15/2024 prices - ready for re-review',
});
console.log(resubmitted.status); // 'PENDING' again
```

## UI Integration

### Approval Button

```tsx
import { approveBatch } from '@/lib/approvals/batch-approvals';

function ApprovalButton({ batchId, status }: Props) {
  const handleApprove = async () => {
    const result = await approveBatch(prisma, {
      tenantId,
      batchId,
      userId: session.user.id,
      comments: 'Approved',
    });

    toast.success('Batch approved');
    router.refresh();
  };

  if (status !== 'PENDING') {
    return null;
  }

  return (
    <button onClick={handleApprove} className="btn btn-primary">
      Approve Batch
    </button>
  );
}
```

### Override Form

```tsx
import { overrideApprovedPrice } from '@/lib/approvals/batch-approvals';

function OverrideForm({ batchId, itemId, currentPrice }: Props) {
  const [price, setPrice] = useState(currentPrice);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const result = await overrideApprovedPrice(prisma, {
      tenantId,
      batchId,
      itemId,
      userId: session.user.id,
      overridePrice: price,
      reason,
    });

    toast.success(`Price overridden: ${result.overridePrice}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(parseFloat(e.target.value))}
        step="0.01"
        required
      />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Override reason (required)"
        required
      />
      <button type="submit" className="btn btn-warning">
        Override Price
      </button>
    </form>
  );
}
```

### Approval Status Badge

```tsx
import { getBatchApprovalStatus } from '@/lib/approvals/batch-approvals';

async function ApprovalStatusBadge({ batchId }: Props) {
  const status = await getBatchApprovalStatus(prisma, tenantId, batchId);

  if (!status) {
    return <span className="badge">No Approval</span>;
  }

  const badges = {
    PENDING: <span className="badge badge-warning">Pending Approval</span>,
    APPROVED: <span className="badge badge-success">Approved</span>,
    REJECTED: <span className="badge badge-error">Rejected</span>,
  };

  return badges[status.status];
}
```

## Security & Permissions

### Role-Based Access

```typescript
// Example middleware for approval permissions
function requireApprovalPermission(userId: string): boolean {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });

  return user?.roles.some((r) => r.name === 'APPROVER' || r.name === 'OWNER');
}

// Usage
if (!requireApprovalPermission(userId)) {
  throw new Error('Insufficient permissions to approve batches');
}
```

### Audit Trail

All approval actions are logged:
- REQUEST_APPROVAL: User requests approval
- APPROVE: User approves batch
- REJECT: User rejects batch
- OVERRIDE: User overrides approved price

Query audit trail:
```typescript
const auditTrail = await prisma.auditLog.findMany({
  where: {
    entityType: 'CALC_BATCH',
    entityId: batchId,
  },
  orderBy: { createdAt: 'asc' },
});
```

## Best Practices

1. **Always provide reasons** for rejections and overrides
2. **Check approval status** before allowing price edits
3. **Log all approval actions** for compliance
4. **Require permissions** for approval operations
5. **Validate batch state** before state transitions
6. **Preserve original prices** when overriding
7. **Use meaningful comments** in approval requests

## Testing

Run tests:
```bash
pnpm test batch-approvals
```

Acceptance tests verify:
- ✓ Approved items reject subsequent edits
- ✓ Overrides store reason in audit log
- ✓ State transitions are validated
- ✓ Original prices are preserved

## Related Documentation

- [Calculation Orchestrator](./calculation-orchestrator.md)
- [Graph Execution](./graph-execution.md)
- [Contributions Waterfall](./contributions-waterfall.md)
