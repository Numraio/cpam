# CPAM Database Entity Relationship Diagram (ERD)

## Overview

The CPAM database extends the BoxyHQ SaaS Starter Kit baseline with domain-specific models for Contract Price Adjustment Mechanism functionality. All CPAM tables use `tenantId` (referencing `Team.id`) for hard multi-tenant isolation.

## Core Domain Models

### Multi-Tenancy

```
Team (BoxyHQ baseline)
├─ id (PK)
├─ name
├─ slug (unique)
├─ domain (unique)
└─ CPAM relations:
   ├─ contracts[]
   ├─ items[]
   ├─ pams[]
   ├─ indexSeries[]
   ├─ indexValues[]
   ├─ calcBatches[]
   ├─ calcResults[]
   ├─ approvalEvents[]
   └─ auditLogs[]
```

---

### Contract Domain

#### Contract
Core contract entity representing supply agreements between parties.

```
Contract
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ name
├─ description (text, nullable)
├─ status (enum: DRAFT | ACTIVE | EXPIRED | TERMINATED) [indexed]
├─ startDate
├─ endDate (nullable)
├─ createdBy (FK → User.id)
├─ createdAt
├─ updatedAt
└─ Relations:
   ├─ tenant → Team
   └─ items[] ← Item

Indexes:
- tenantId
- status
- (tenantId, status) composite
```

#### Item
Items (SKUs/products) within contracts that are subject to price adjustments.

```
Item
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ contractId (FK → Contract.id) [indexed]
├─ sku (unique per tenant+contract)
├─ name
├─ description (text, nullable)
├─ basePrice (decimal 20,12) -- 12 decimal precision
├─ baseCurrency (varchar 3) -- ISO 4217 code
├─ uom (unit of measure: MT, kg, lb, bbl, etc.)
├─ pamId (FK → PAM.id, nullable) [indexed]
├─ createdAt
├─ updatedAt
└─ Relations:
   ├─ tenant → Team
   ├─ contract → Contract
   ├─ pam → PAM (optional)
   └─ results[] ← CalcResult

Unique Constraint: (tenantId, contractId, sku)
```

#### PAM (Price Adjustment Mechanism)
Formula/rule definitions for calculating price adjustments.

```
PAM
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ name [indexed with tenantId]
├─ description (text, nullable)
├─ version (int, default 1)
├─ graph (jsonb) -- DAG structure with nodes & edges
├─ createdBy (FK → User.id)
├─ createdAt
├─ updatedAt
└─ Relations:
   ├─ tenant → Team
   ├─ items[] ← Item
   └─ calcBatches[] ← CalcBatch

Graph Structure (JSON):
{
  nodes: [
    { id, type: "Factor|Transform|Convert|Combine|Controls", config: {...} }
  ],
  edges: [ { from, to } ],
  output: "nodeId"
}
```

---

### Timeseries Domain

#### IndexSeries
Metadata about timeseries data sources (commodity indices, FX rates, custom data).

```
IndexSeries
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ seriesCode (unique per tenant: "PLATTS_BRENT", "USD_EUR")
├─ name
├─ description (text, nullable)
├─ provider (e.g., "PLATTS", "OANDA", "MANUAL") [indexed]
├─ dataType ("INDEX" | "FX" | "CUSTOM")
├─ unit (nullable: "USD/bbl", "EUR/USD")
├─ frequency ("DAILY" | "WEEKLY" | "MONTHLY")
├─ createdAt
├─ updatedAt
└─ Relations:
   ├─ tenant → Team
   └─ values[] ← IndexValue

Unique Constraint: (tenantId, seriesCode)
```

#### IndexValue
Actual timeseries data points with versioning support (preliminary/final/revised).

```
IndexValue
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ seriesId (FK → IndexSeries.id) [indexed with asOfDate]
├─ asOfDate (date) [indexed]
├─ value (decimal 20,12) -- 12 decimal precision
├─ versionTag (enum: PRELIMINARY | FINAL | REVISED)
├─ providerTimestamp (nullable)
├─ ingestedAt
└─ Relations:
   ├─ tenant → Team
   └─ series → IndexSeries

Unique Constraint: (seriesId, asOfDate, versionTag)
-- Allows multiple versions for same date
```

---

### Calculation Domain

#### CalcBatch
Batch calculation runs for executing PAM formulas against contracts/items.

```
CalcBatch
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ pamId (FK → PAM.id) [indexed]
├─ contractId (FK → Contract.id, nullable)
├─ inputsHash (hex string for idempotency) [indexed]
├─ status (enum: QUEUED | RUNNING | COMPLETED | FAILED) [indexed]
├─ startedAt (nullable)
├─ completedAt (nullable)
├─ error (text, nullable)
├─ metadata (jsonb, nullable) -- run params, trigger info
├─ createdAt
├─ updatedAt
└─ Relations:
   ├─ tenant → Team
   ├─ pam → PAM
   └─ results[] ← CalcResult
```

#### CalcResult
Individual calculation results per item, including contribution waterfall.

```
CalcResult
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ batchId (FK → CalcBatch.id) [indexed]
├─ itemId (FK → Item.id) [indexed]
├─ adjustedPrice (decimal 20,12)
├─ adjustedCurrency (varchar 3)
├─ contributions (jsonb) -- waterfall breakdown
├─ effectiveDate (date)
├─ createdAt
└─ Relations:
   ├─ tenant → Team
   ├─ batch → CalcBatch
   └─ item → Item

Unique Constraint: (batchId, itemId, effectiveDate)

Contributions JSON:
{
  base: 100.00,
  indexAdjustment: 25.50,
  premium: 10.00,
  controls: -5.00,
  ...
}
```

---

### Approval & Audit Domain

#### ApprovalEvent
Approval workflow tracking for calc batches, contracts, PAMs.

```
ApprovalEvent
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed]
├─ entityType ("CALC_BATCH" | "CONTRACT" | "PAM") [indexed with entityId]
├─ entityId (uuid)
├─ status (enum: PENDING | APPROVED | REJECTED) [indexed]
├─ approvedBy (FK → User.id, nullable)
├─ rejectedBy (FK → User.id, nullable)
├─ comments (text, nullable)
├─ approvedAt (nullable)
├─ rejectedAt (nullable)
├─ createdAt
├─ updatedAt
└─ Relations:
   └─ tenant → Team

Composite Index: (entityType, entityId)
```

#### AuditLog
Domain-specific audit trail (supplements Retraced integration).

```
AuditLog
├─ id (PK, uuid)
├─ tenantId (FK → Team.id) [indexed with createdAt]
├─ userId (FK → User.id) [indexed]
├─ action ("CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "CALCULATE")
├─ entityType ("CONTRACT" | "ITEM" | "PAM" | "CALC_BATCH") [indexed with entityId]
├─ entityId (uuid)
├─ changes (jsonb, nullable) -- before/after state
├─ ipAddress (nullable)
├─ userAgent (text, nullable)
├─ createdAt [indexed]
└─ Relations:
   └─ tenant → Team

Indexes:
- tenantId
- userId
- (entityType, entityId)
- createdAt
- (tenantId, createdAt) composite
```

---

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANCY                          │
└─────────────────────────────────────────────────────────────────┘
                                Team
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────┴────────┐            ┌────────┴────────┐
        │   BoxyHQ Base   │            │   CPAM Domain   │
        └─────────────────┘            └─────────────────┘
        - User                         - Contract
        - TeamMember                   - Item
        - Invitation                   - PAM
        - ApiKey                       - IndexSeries
        - Subscription                 - IndexValue
        - Service                      - CalcBatch
        - Price                        - CalcResult
                                      - ApprovalEvent
                                      - AuditLog

┌─────────────────────────────────────────────────────────────────┐
│                      CONTRACT DOMAIN                           │
└─────────────────────────────────────────────────────────────────┘
   Team ─────┬──> Contract ──> Item ──> CalcResult
             │        │          │
             │        │          └──> PAM ──> CalcBatch
             │        │                         │
             │        └─────────────────────────┘
             │
             └──> PAM (shared across contracts)

┌─────────────────────────────────────────────────────────────────┐
│                    TIMESERIES DOMAIN                           │
└─────────────────────────────────────────────────────────────────┘
   Team ──> IndexSeries ──> IndexValue
                               (versioned: prelim/final/revised)

┌─────────────────────────────────────────────────────────────────┐
│                   CALCULATION FLOW                             │
└─────────────────────────────────────────────────────────────────┘
   PAM ──> CalcBatch ──> CalcResult ──> ApprovalEvent
     │         │             │               │
     │         │             └──> Item       └──> AuditLog
     │         └──> Contract (optional)
     └──> IndexSeries (referenced in graph nodes)

┌─────────────────────────────────────────────────────────────────┐
│                  APPROVAL & AUDIT FLOW                         │
└─────────────────────────────────────────────────────────────────┘
   User ──> AuditLog (tracks all actions)
            ApprovalEvent (tracks approvals for entities)
```

---

## Data Types & Precision

### Decimal Precision
All financial values use **DECIMAL(20, 12)**:
- **20 digits total** (integral + fractional)
- **12 decimal places** for precise calculations
- Prevents floating-point rounding errors in price adjustments

Example: `123456789.123456789012`

### Enums

```typescript
ContractStatus = DRAFT | ACTIVE | EXPIRED | TERMINATED
VersionTag = PRELIMINARY | FINAL | REVISED
ApprovalStatus = PENDING | APPROVED | REJECTED
CalcStatus = QUEUED | RUNNING | COMPLETED | FAILED
```

### JSON Structures

**PAM Graph:**
```json
{
  "nodes": [
    { "id": "base", "type": "Factor", "config": { "series": "PLATTS_BRENT" } },
    { "id": "convert", "type": "Convert", "config": { "from": "USD/bbl", "to": "USD/MT" } }
  ],
  "edges": [
    { "from": "base", "to": "convert" }
  ],
  "output": "convert"
}
```

**Contributions Waterfall:**
```json
{
  "base": 100.00,
  "indexAdjustment": 25.50,
  "premium": 10.00,
  "controls": -5.00
}
```

---

## Multi-Tenancy Isolation

### Hard Isolation Strategy
- **Every CPAM table** includes `tenantId` column (FK to `Team.id`)
- All queries **MUST** include tenant scoping (enforced via Prisma middleware - Issue #3)
- **Cascade deletes**: Deleting a Team cascades to all CPAM data
- **Prevents cross-tenant access** at database level via FK constraints

### Tenant Scoping Pattern
```typescript
// All queries must include tenantId filter
const items = await prisma.item.findMany({
  where: { tenantId: currentTeam.id }
})
```

---

## Performance Considerations

### Composite Indexes
- `(tenantId, status)` on Contract - common query pattern
- `(tenantId, seriesCode)` on IndexSeries - unique lookup
- `(seriesId, asOfDate, versionTag)` on IndexValue - timeseries queries
- `(batchId, itemId, effectiveDate)` on CalcResult - unique constraint + query
- `(tenantId, createdAt)` on AuditLog - time-range queries

### Partitioning Candidates (Future)
- **IndexValue**: Partition by `asOfDate` (monthly/yearly) as data grows
- **AuditLog**: Partition by `createdAt` for archival

### Query Patterns
- **Range queries** on IndexValue: `WHERE seriesId = ? AND asOfDate BETWEEN ? AND ?`
- **Version preference**: `WHERE ... AND versionTag = 'FINAL' OR (versionTag = 'PRELIMINARY' AND NOT EXISTS(...))`
- **Audit queries**: `WHERE tenantId = ? AND createdAt > ?` (hot data queries)

---

## Migration Path

### Current Migration
```
20251104000000_add_cpam_core_models
```

Creates:
- 4 enums (ContractStatus, VersionTag, ApprovalStatus, CalcStatus)
- 9 tables (Contract, Item, PAM, IndexSeries, IndexValue, CalcBatch, CalcResult, ApprovalEvent, AuditLog)
- All FK constraints to Team for tenant isolation
- 25+ indexes for query performance

### Seed Data
The seed file (`prisma/seed.ts`) creates:
- 5 teams with users
- 1-3 contracts per team
- 1-2 PAMs per team
- 2-6 items per contract
- 4 index series per team (Brent, Copper, USD_EUR, USD_GBP)
- 90 days of historical index values
- 1-3 calc batches per PAM
- Results for completed batches
- Approval events
- 50 audit log entries

---

## Related Issues

- **Issue #8**: Core data model (this document)
- **Issue #3**: Multi-tenancy - Prisma middleware for tenant scoping
- **Issue #9**: Timeseries store - Partitioning & query optimization
- **Issue #17**: PAM graph schema - Zod validation for graph JSON
- **Issue #22**: Calc orchestrator - Batch execution logic
- **Issue #24**: Approvals workflow - Locking & override logic

---

## Next Steps

1. **Issue #3**: Implement Prisma middleware for automatic tenant scoping
2. **Issue #17**: Define Zod schemas for PAM graph JSON validation
3. **Issue #7**: Add job queue tables (if using pg-boss or similar)
4. **Issue #9**: Consider TimescaleDB extension for IndexValue table
5. **Testing**: Add constraint validation tests (FK violations, unique violations)
