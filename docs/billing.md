## Billing & Usage Limits

Stripe-based subscription billing with Items under Management (IuM) entitlement enforcement.

## Overview

The billing system integrates with Stripe to manage subscriptions and enforce usage limits based on plan tiers. Features include:

- **Stripe integration** - Webhook handling for subscription events
- **Usage tracking** - Cached counter for Items under Management (IuM)
- **Plan gates** - Enforce limits at API level
- **UI warnings** - Visual indicators when approaching limits
- **Flexible entitlements** - Configure limits via Stripe metadata or price mappings
- **Upgrade prompts** - Direct users to upgrade when hitting limits

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Stripe    │─────▶│   Webhook    │─────▶│ Subscription │
│   Portal    │      │   Handler    │      │    Model     │
└─────────────┘      └──────────────┘      └──────────────┘
                              │                     │
                              │                     ▼
                              │            ┌──────────────┐
                              └───────────▶│ Entitlements │
                                           │  (maxIuM)    │
                                           └──────────────┘
                                                   │
                                                   ▼
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Item API   │─────▶│  Plan Gate   │◀────▶│    Usage     │
│  (Create)   │      │ canCreateItem│      │   Counter    │
└─────────────┘      └──────────────┘      └──────────────┘
                              │                     │
                              ▼                     ▼
                     ┌──────────────┐      ┌──────────────┐
                     │  403 Error   │      │  UI Banner   │
                     │ + Upgrade    │      │ + Meter      │
                     └──────────────┘      └──────────────┘
```

## Data Model

### Subscription

```prisma
model Subscription {
  id         String    @id
  customerId String    // Stripe customer ID
  priceId    String    // Stripe price ID
  active     Boolean   @default(false)
  startDate  DateTime
  endDate    DateTime
  cancelAt   DateTime?

  // Entitlements
  maxItemsUnderManagement Int? // IuM limit, null = unlimited

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @default(now())

  @@index([customerId])
}
```

### Team

```prisma
model Team {
  // ... existing fields

  // Usage tracking (cached, updated on item create/delete)
  itemsUnderManagement Int @default(0)
  usageLastUpdated     DateTime?
}
```

## Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional
DEFAULT_IUM_LIMIT=100  # Default IuM limit for free tier (default: 100)
```

## Stripe Setup

### 1. Create Products & Prices

In Stripe Dashboard, create products with prices:

```
Product: Free
- Price: price_free (or use default limit)
- Features: 100 items

Product: Starter
- Price: price_starter
- Features: 1,000 items

Product: Professional
- Price: price_professional
- Features: 10,000 items

Product: Enterprise
- Price: price_enterprise
- Features: Unlimited items
```

### 2. Configure Price Mappings

Update [pages/api/webhooks/stripe.ts](pages/api/webhooks/stripe.ts:162-168) with your price IDs:

```typescript
const priceLimits: Record<string, number | null> = {
  'price_free': 100,
  'price_starter': 1000,
  'price_professional': 10000,
  'price_enterprise': null, // unlimited
};
```

### 3. Set Up Webhook

In Stripe Dashboard:
1. Go to Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Configure Metadata (Optional)

For dynamic limits without code changes, add metadata to subscriptions:

```typescript
// When creating subscription in Stripe
{
  metadata: {
    maxItemsUnderManagement: "1000", // or "-1" for unlimited
  }
}
```

**Priority:**
1. `subscription.metadata.maxItemsUnderManagement` (highest)
2. Hardcoded price ID mappings
3. Default limit from `DEFAULT_IUM_LIMIT` env var (lowest)

## Usage Service

### Get Current Usage

```typescript
import { getTeamUsage } from '@/lib/billing/usage-service';

const usage = await getTeamUsage('tenant-123');
// {
//   itemsUnderManagement: 50,
//   lastUpdated: Date,
// }
```

### Get Entitlements

```typescript
import { getTeamEntitlements } from '@/lib/billing/usage-service';

const entitlements = await getTeamEntitlements('tenant-123');
// {
//   maxItemsUnderManagement: 100,  // or null for unlimited
//   planName: "Free",
//   active: true,
// }
```

### Check if Can Create Item (Plan Gate)

```typescript
import { canCreateItem } from '@/lib/billing/usage-service';

const check = await canCreateItem('tenant-123');

if (!check.allowed) {
  // At limit
  console.log(check.reason); // "You've reached your plan limit of 100 items..."
  console.log(check.usage);  // { current: 100, limit: 100 }
  // Show upgrade prompt
}
```

### Update Usage Counter

```typescript
import { incrementUsage, decrementUsage, recalculateUsage } from '@/lib/billing/usage-service';

// On item creation
await incrementUsage('tenant-123'); // Returns new count

// On item deletion
await decrementUsage('tenant-123'); // Returns new count

// Recalculate (for reconciliation)
await recalculateUsage('tenant-123'); // Counts items directly
```

## API Endpoints

### Create Item (with Plan Gate)

```bash
POST /api/teams/:slug/items
Content-Type: application/json

{
  "name": "My Item",
  "description": "Item description"
}
```

**Success (201):**
```json
{
  "item": { "id": "...", "name": "My Item", ... },
  "usage": { "current": 51, "limit": 100 }
}
```

**Plan Limit Exceeded (403):**
```json
{
  "error": "Plan limit exceeded",
  "message": "You've reached your plan limit of 100 items. Please upgrade to add more items.",
  "usage": { "current": 100, "limit": 100 },
  "upgradeRequired": true
}
```

### Delete Item (Decrements Usage)

```bash
DELETE /api/teams/:slug/items/:itemId
```

**Success (200):**
```json
{
  "success": true
}
```

### Get Usage & Entitlements

```bash
GET /api/teams/:slug/usage
```

**Response (200):**
```json
{
  "usage": {
    "itemsUnderManagement": 90,
    "lastUpdated": "2024-01-15T10:00:00Z"
  },
  "entitlements": {
    "maxItemsUnderManagement": 100,
    "planName": "Free",
    "active": true
  },
  "metrics": {
    "percentageUsed": 90,
    "warningLevel": "high",
    "remaining": 10,
    "canAddMore": true
  }
}
```

**Warning Levels:**
- `none` - < 50% used
- `low` - 50-74% used
- `medium` - 75-89% used
- `high` - 90-99% used
- `critical` - 100% used (at limit)

## UI Components

### Usage Banner

Displays warning when approaching or exceeding limit:

```tsx
import { UsageBanner } from '@/components/billing/UsageBanner';

<UsageBanner
  current={90}
  limit={100}
  warningLevel="high"
  onUpgrade={() => router.push('/billing')}
/>
```

**Visual styles by warning level:**
- `low` - Blue info banner
- `medium` - Yellow warning banner
- `high` - Orange alert banner
- `critical` - Red error banner

### Usage Meter

Visual progress bar of usage:

```tsx
import { UsageMeter } from '@/components/billing/UsageMeter';

<UsageMeter
  current={50}
  limit={100}
  className="mb-4"
/>
```

**Colors by usage:**
- Green: 0-74%
- Yellow: 75-89%
- Orange: 90-99%
- Red: 100%+

### Usage Hook

React hook to fetch usage data:

```tsx
import { useUsage } from '@/hooks/useUsage';

function MyComponent() {
  const { usage, entitlements, metrics, isLoading } = useUsage(teamSlug);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <UsageBanner
        current={usage.itemsUnderManagement}
        limit={entitlements.maxItemsUnderManagement}
        warningLevel={metrics.warningLevel}
      />
      <UsageMeter
        current={usage.itemsUnderManagement}
        limit={entitlements.maxItemsUnderManagement}
      />
    </>
  );
}
```

## Webhook Processing

### Subscription Created

```
1. Stripe sends customer.subscription.created webhook
2. Handler extracts maxIuM from metadata or price mapping
3. createStripeSubscription() called with maxItemsUnderManagement
4. Subscription record created in database
5. Team can now create items up to limit
```

### Subscription Updated

```
1. User upgrades/downgrades plan in Stripe
2. Stripe sends customer.subscription.updated webhook
3. Handler extracts new maxIuM from metadata or price mapping
4. updateStripeSubscription() updates maxItemsUnderManagement
5. Limit immediately reflects in canCreateItem() checks
```

### Subscription Deleted

```
1. User cancels subscription
2. Stripe sends customer.subscription.deleted webhook
3. deleteStripeSubscription() removes subscription record
4. Team reverts to free tier (default limit)
```

## Plan Configurations

### Free Tier (No Subscription)

- Default limit: 100 items (or `DEFAULT_IUM_LIMIT`)
- No Stripe subscription required
- Good for trial/onboarding

### Starter Plan

**Setup:**
```typescript
// In Stripe Dashboard, add metadata to subscription:
{
  metadata: {
    maxItemsUnderManagement: "1000",
  }
}
```

**Or use price mapping:**
```typescript
const priceLimits = {
  'price_starter': 1000,
};
```

### Enterprise Plan (Unlimited)

**Setup:**
```typescript
// In Stripe Dashboard, add metadata:
{
  metadata: {
    maxItemsUnderManagement: "-1", // -1 = unlimited
  }
}
```

**Or use price mapping:**
```typescript
const priceLimits = {
  'price_enterprise': null, // null = unlimited
};
```

## Error Handling

### Plan Limit Exceeded

**API Response:**
```json
{
  "error": "Plan limit exceeded",
  "message": "You've reached your plan limit of 100 items. Please upgrade to add more items.",
  "usage": { "current": 100, "limit": 100 },
  "upgradeRequired": true
}
```

**UI Handling:**
```tsx
try {
  const res = await fetch('/api/teams/acme/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });

  if (res.status === 403) {
    const data = await res.json();
    if (data.upgradeRequired) {
      // Show upgrade modal/redirect to billing
      showUpgradeModal(data.message);
    }
  }
} catch (error) {
  // Handle network errors
}
```

### Usage Counter Drift

If cached counter drifts from actual count (rare, from race conditions):

```typescript
// Reconcile usage
await recalculateUsage('tenant-123');

// Or add periodic reconciliation job
// Run daily/weekly to ensure accuracy
```

## Testing

### Unit Tests

See [__tests__/lib/billing/usage-service.spec.ts](__tests__/lib/billing/usage-service.spec.ts) for test cases:

- Usage counter increment/decrement
- Entitlements extraction
- Plan gate enforcement
- Default limit handling

### Acceptance Tests

**Test Scenario 1: Hitting IuM Limit**
```
Given a tenant with 99 items (limit: 100)
When creating 2 items
Then first item succeeds
And second item returns 403 with upgradeRequired: true
And UI shows upgrade prompt
```

**Test Scenario 2: Stripe Webhook Updates Limit**
```
Given tenant on Starter plan (100 items)
When Stripe sends subscription.updated with maxIuM: 1000
Then subscription.maxItemsUnderManagement = 1000
And canCreateItem() allows creation
And UI banner changes from "high" to "none"
```

**Test Scenario 3: Unlimited Plan**
```
Given subscription with metadata.maxItemsUnderManagement = "-1"
When extractMaxIuM() called
Then returns null (unlimited)
And canCreateItem() always returns { allowed: true }
And UI shows "Unlimited plan"
```

### Manual Testing with Stripe CLI

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Best Practices

### 1. Always Check Plan Gate Before Creation

```typescript
// ✅ Good: Check before creating
const check = await canCreateItem(tenantId);
if (!check.allowed) {
  return res.status(403).json({ error: 'Plan limit exceeded', ... });
}
await createItem(data);

// ❌ Bad: Create without checking
await createItem(data); // May exceed limit
```

### 2. Show Usage in UI

```tsx
// ✅ Good: Show usage and warnings
<UsageBanner {...metrics} />
<UsageMeter current={usage} limit={limit} />
<Button disabled={!metrics.canAddMore}>Add Item</Button>

// ❌ Bad: No visibility into usage
<Button>Add Item</Button> // User doesn't know why it might fail
```

### 3. Increment/Decrement Usage Consistently

```typescript
// ✅ Good: Always update counter
await prisma.item.create({ data });
await incrementUsage(tenantId);

// ❌ Bad: Forget to update counter
await prisma.item.create({ data });
// Counter now out of sync!
```

### 4. Handle 403 Gracefully

```tsx
// ✅ Good: Show upgrade prompt
if (error.status === 403 && error.upgradeRequired) {
  showModal({
    title: 'Upgrade Required',
    message: error.message,
    action: 'Upgrade Plan',
    onAction: () => router.push('/billing'),
  });
}

// ❌ Bad: Generic error
alert('Failed to create item'); // No context or solution
```

### 5. Use Metadata for Flexibility

```typescript
// ✅ Good: Use metadata for per-customer limits
// Allows custom limits without code changes
{
  metadata: {
    maxItemsUnderManagement: "5000", // Custom limit
  }
}

// ❌ Bad: Hardcode all limits in code
// Requires deployment for every limit change
```

## Troubleshooting

### Usage counter is wrong

**Cause:** Race condition or missed increment/decrement

**Solution:**
```typescript
await recalculateUsage(tenantId);
```

### Plan limit not updating after upgrade

**Cause:** Webhook not processed or metadata missing

**Solution:**
1. Check webhook delivery in Stripe Dashboard
2. Verify webhook secret is correct
3. Check logs for errors in webhook handler
4. Manually update subscription if needed

### Warning banner not showing

**Cause:** Usage data not fetched or stale

**Solution:**
```tsx
const { mutate } = useUsage(teamSlug);
mutate(); // Refresh usage data
```

### Subscription shows wrong limit

**Cause:** Metadata or price mapping misconfigured

**Solution:**
1. Check `subscription.metadata.maxItemsUnderManagement` in Stripe
2. Verify price ID is in `priceLimits` mapping
3. Check `DEFAULT_IUM_LIMIT` env var

## Future Enhancements

- Usage-based pricing (per-item charges)
- Multiple usage dimensions (e.g., API calls, storage)
- Grace period after hitting limit
- Automatic upgrades on limit hit
- Usage analytics dashboard
- Billing alerts (email/Slack when approaching limit)
- Annual vs monthly billing discounts

## Related Documentation

- [Multi-tenancy](./multi-tenancy.md) - Tenant isolation
- [Authorization](./authorization.md) - Role-based access control
- [Audit Logging](./audit-logging.md) - Track subscription changes
