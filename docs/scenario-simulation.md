## Scenario Simulation

What-if analysis for pricing calculations without affecting published prices.

## Overview

Scenarios allow users to test different inputs and assumptions before committing to production calculations. Features include:

- **Isolated calculations** - Scenarios don't affect published prices
- **Input overrides** - Override item properties or index values
- **Side-by-side comparison** - Compare scenarios or against baseline
- **CSV export** - Export comparison results
- **Clone scenarios** - Duplicate scenarios for iteration
- **Audit trail** - All scenario calculations are tracked

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Scenario   │─────▶│   Overrides  │─────▶│  CalcBatch   │
│  (What-if)  │      │ (Item/Index) │      │ (scenarioId) │
└─────────────┘      └──────────────┘      └──────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ CalcResults  │
                                            │ (Isolated)   │
                                            └──────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  Comparison  │
                                            │  Service     │
                                            └──────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  CSV Export  │
                                            └──────────────┘
```

## Data Model

### Scenario

```prisma
model Scenario {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  pamId       String // Which PAM this scenario is based on
  baselineId  String? // Optional: compare against this batch

  // Overrides - what inputs are being changed
  overrides   Json // { itemOverrides: {...}, indexOverrides: {...} }

  // Published flag - always false for scenarios
  published   Boolean  @default(false)

  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  tenant      Team
  pam         PAM
  batches     CalcBatch[] // Calculations for this scenario
}
```

### CalcBatch (Extended)

```prisma
model CalcBatch {
  scenarioId  String? // If set, this is a scenario calculation

  // Relations
  scenario    Scenario?
}
```

## Override Structure

### Item Overrides

Override properties for specific items:

```typescript
{
  itemOverrides: {
    "item-123": {
      basePrice: 100,       // Override base price
      baseCurrency: "EUR",  // Override currency
      quantity: 1000,       // Override quantity
      // ... any other item property
    },
    "item-456": {
      basePrice: 200,
    }
  }
}
```

### Index Overrides

Override index values for specific dates:

```typescript
{
  indexOverrides: {
    "WTI": {
      "2024-01-15": 75.50,   // Override WTI on Jan 15
      "2024-01-16": 76.00,
    },
    "BRENT": {
      "2024-01-15": 80.25,
    }
  }
}
```

### Combined Example

```typescript
{
  itemOverrides: {
    "item-123": { basePrice: 100 }
  },
  indexOverrides: {
    "WTI": {
      "2024-01-15": 75.50
    }
  }
}
```

## Usage

### Create Scenario

```typescript
import { createScenario } from '@/lib/scenarios/scenario-service';

const scenario = await createScenario({
  tenantId: 'tenant-123',
  name: 'What if WTI increases by $5?',
  description: 'Test impact of WTI price increase',
  pamId: 'pam-123',
  baselineId: 'batch-456', // Optional: compare against this
  overrides: {
    indexOverrides: {
      'WTI': {
        '2024-01-15': 80.00, // Increased from $75
      },
    },
  },
  createdBy: 'user-789',
});
```

### Execute Scenario

```typescript
import { executeScenario } from '@/lib/scenarios/scenario-execution';

const result = await executeScenario({
  scenarioId: scenario.id,
  asOfDate: new Date('2024-01-15'),
  versionPreference: 'FINAL',
  itemIds: ['item-123', 'item-456'], // Optional: specific items only
});

// result.batchId - CalcBatch ID
// result.status - 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
// result.results - CalcResult[] (when completed)
```

### Compare Scenarios

```typescript
import { compareScenarios } from '@/lib/scenarios/scenario-comparison';

const comparison = await compareScenarios(
  'scenario-1-id',
  'scenario-2-id'
);

// comparison.rows - Array of ComparisonRow
// comparison.summary - Summary statistics
```

**Comparison Structure:**
```typescript
{
  baselineName: "Scenario A",
  scenarioName: "Scenario B",
  rows: [
    {
      itemId: "item-123",
      itemName: "Widget",
      sku: "WDG-001",
      baselinePrice: 100.00,
      scenarioPrice: 105.00,
      delta: 5.00,
      deltaPercent: 5.00,
      currency: "USD"
    }
  ],
  summary: {
    totalItems: 100,
    itemsChanged: 75,
    itemsUnchanged: 25,
    avgDelta: 3.50,
    maxDelta: 10.00,
    minDelta: 0.10,
    totalDelta: 262.50
  }
}
```

### Compare to Baseline

```typescript
import { compareScenarioToBaseline } from '@/lib/scenarios/scenario-comparison';

const comparison = await compareScenarioToBaseline(
  'scenario-id',
  'baseline-batch-id'
);
```

### Export Comparison to CSV

```typescript
import { exportComparisonToCSV } from '@/lib/scenarios/scenario-comparison';

const csv = exportComparisonToCSV(comparison);

// CSV format:
// Item ID,Item Name,SKU,Baseline Price,Scenario Price,Delta,Delta %,Currency
// item-123,Widget,WDG-001,100.00,105.00,5.00,5.00,USD
// ...
// SUMMARY
// Total Items,100
// Items Changed,75
// ...
```

### Clone Scenario

```typescript
import { cloneScenario } from '@/lib/scenarios/scenario-service';

const cloned = await cloneScenario(
  'scenario-id',
  'Cloned Scenario',
  'user-789'
);

// Cloned scenario has same overrides as original
// Independent - changes don't affect original
```

## API Endpoints

### List Scenarios

```bash
GET /api/teams/:slug/scenarios?pamId=pam-123
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": "scenario-123",
      "name": "What if WTI increases?",
      "description": "...",
      "pamId": "pam-123",
      "overrides": {...},
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Create Scenario

```bash
POST /api/teams/:slug/scenarios
Content-Type: application/json

{
  "name": "What if scenario",
  "description": "Test assumptions",
  "pamId": "pam-123",
  "baselineId": "batch-456",
  "overrides": {
    "itemOverrides": {...},
    "indexOverrides": {...}
  }
}
```

### Get Scenario

```bash
GET /api/teams/:slug/scenarios/:scenarioId
```

### Update Scenario

```bash
PATCH /api/teams/:slug/scenarios/:scenarioId
Content-Type: application/json

{
  "name": "Updated name",
  "overrides": {...}
}
```

### Delete Scenario

```bash
DELETE /api/teams/:slug/scenarios/:scenarioId
```

### Execute Scenario

```bash
POST /api/teams/:slug/scenarios/:scenarioId/execute
Content-Type: application/json

{
  "asOfDate": "2024-01-15T00:00:00Z",
  "versionPreference": "FINAL",
  "itemIds": ["item-123", "item-456"]
}
```

**Response:**
```json
{
  "batchId": "batch-789",
  "scenarioId": "scenario-123",
  "status": "QUEUED"
}
```

### Compare Scenarios

```bash
POST /api/teams/:slug/scenarios/:scenarioId/compare
Content-Type: application/json

{
  "compareToScenarioId": "scenario-456"
}
```

**Or compare to baseline:**
```bash
{
  "compareToBaselineId": "batch-456"
}
```

### Export Comparison as CSV

```bash
GET /api/teams/:slug/scenarios/:scenarioId/compare?compareToScenarioId=scenario-456
```

**Response:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="scenario-comparison-scenario-123.csv"

Item ID,Item Name,SKU,Baseline Price,Scenario Price,Delta,Delta %,Currency
...
```

## Isolation Guarantees

### Scenarios Don't Affect Published Prices

- `Scenario.published` is always `false`
- `CalcBatch.scenarioId` is set for scenario calculations
- Scenario results are stored separately
- No cross-contamination with production calculations

### Independent Inputs Hash

Scenario calculations use a unique inputs hash that includes:
1. PAM graph
2. Calculation context
3. **Scenario ID** (ensures uniqueness)

This prevents scenario calculations from being deduplicated with production calculations.

### Audit Trail

All scenario calculations are tracked:
- `CalcBatch` records persist even after scenario deletion
- `CalcBatch.scenarioId` set to `null` on scenario delete (audit remains)
- Full history of scenario executions available

## Use Cases

### 1. Test Price Index Changes

**Scenario:** What if WTI price increases by $10?

```typescript
await createScenario({
  name: 'WTI +$10',
  overrides: {
    indexOverrides: {
      'WTI': {
        '2024-01-15': 85.00, // Base: $75
        '2024-01-16': 86.00, // Base: $76
      },
    },
  },
});
```

**Result:** See impact on all WTI-dependent items

### 2. Test Quantity Changes

**Scenario:** What if customer orders 2x quantity?

```typescript
await createScenario({
  name: 'Double Quantity',
  overrides: {
    itemOverrides: {
      'item-123': { quantity: 2000 }, // Base: 1000
    },
  },
});
```

**Result:** See volume-based pricing impact

### 3. Test Currency Changes

**Scenario:** What if we price in EUR instead of USD?

```typescript
await createScenario({
  name: 'EUR Pricing',
  overrides: {
    itemOverrides: {
      'item-123': { baseCurrency: 'EUR' },
    },
  },
});
```

**Result:** See FX impact on pricing

### 4. Test Multiple Scenarios

**Scenario:** Compare 3 different assumptions

1. Create "Conservative" scenario (moderate price increases)
2. Create "Optimistic" scenario (lower prices)
3. Create "Pessimistic" scenario (higher prices)
4. Execute all 3
5. Compare side-by-side

**Result:** Understand range of possible outcomes

### 5. Test Before Production

**Scenario:** Validate new PAM before approval

1. Create scenario with production inputs
2. Execute scenario
3. Review results
4. If good, promote to production (create approval proposal)
5. If bad, adjust PAM and re-test

**Result:** Catch errors before affecting customers

## Best Practices

### 1. Use Descriptive Names

```typescript
// ✅ Good: Clear intent
name: "What if WTI increases by $10?"

// ❌ Bad: Vague
name: "Test 1"
```

### 2. Document Assumptions

```typescript
// ✅ Good: Explain why
description: "Testing impact of expected Q2 2024 oil price increase based on OPEC+ production cuts"

// ❌ Bad: No context
description: "Oil test"
```

### 3. Start with Small Overrides

```typescript
// ✅ Good: Test one thing at a time
overrides: {
  indexOverrides: {
    'WTI': { '2024-01-15': 80.00 }
  }
}

// ❌ Bad: Too many variables
overrides: {
  itemOverrides: { ... 50 items ... },
  indexOverrides: { ... 20 indices ... }
}
```

### 4. Compare Against Baseline

```typescript
// ✅ Good: Set baseline for comparison
await createScenario({
  baselineId: 'latest-production-batch',
  ...
});

// ❌ Bad: No baseline (harder to understand impact)
```

### 5. Clean Up Old Scenarios

```typescript
// Delete scenarios after decision made
// Keeps list manageable
await deleteScenario('old-scenario-id');
```

## Limitations

### 1. Scenarios Are Read-Only for Approvals

Scenarios cannot be directly approved/published. To promote a scenario to production:

1. Create scenario
2. Execute and validate
3. Apply same overrides to actual production data
4. Create approval proposal
5. Approve through normal workflow

### 2. Overrides Are Manual

Scenario overrides must be manually specified. No automatic "increase all prices by 10%" function.

**Workaround:** Create overrides programmatically before creating scenario.

### 3. No Real-Time Collaboration

Multiple users editing the same scenario may conflict.

**Workaround:** Clone scenario for independent work, then compare results.

### 4. Limited to Single PAM

Each scenario is tied to one PAM. Cannot test across multiple PAMs simultaneously.

**Workaround:** Create separate scenarios for each PAM, then compare manually.

## Troubleshooting

### Scenario execution never completes

**Cause:** Calculation orchestrator not running or batch failed

**Solution:**
```typescript
// Check batch status
const batch = await prisma.calcBatch.findUnique({
  where: { id: result.batchId },
});

console.log(batch.status); // Check if FAILED
console.log(batch.error);  // Check error message
```

### Comparison shows no differences

**Cause:** Overrides not applied or identical inputs

**Solution:**
1. Verify scenario overrides are set
2. Check that overridden values actually differ from baseline
3. Ensure scenarios were executed (not just created)

### CSV export fails

**Cause:** No comparison data or missing results

**Solution:**
1. Execute both scenarios first
2. Verify scenarios have completed successfully
3. Check that items exist in both scenarios

## Testing

See [__tests__/lib/scenarios/scenario-service.spec.ts](__tests__/lib/scenarios/scenario-service.spec.ts) for test cases:

- Scenario CRUD operations
- Override application
- Execution with isolation
- Comparison calculations
- CSV export

## Related Documentation

- [Calculation Orchestrator](./calculation-orchestrator.md) - How calculations work
- [PAM Builder UI](./pam-builder-ui.md) - Creating PAMs
- [Approvals Workflow](./approvals-workflow.md) - Promoting scenarios to production
- [Audit Logging](./audit-logging.md) - Tracking scenario changes

## Future Enhancements

- UI for scenario builder with visual diff
- Automatic scenario generation (sensitivity analysis)
- Real-time collaboration on scenarios
- Scenario templates for common use cases
- Batch scenario execution (run 10 scenarios at once)
- Scenario versioning (track changes over time)
- Scenario sharing across tenants (for benchmarking)
