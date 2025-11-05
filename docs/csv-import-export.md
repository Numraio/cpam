### CSV Import/Export

Streaming CSV import/export with Zod validation, dry-run mode, and row-level error handling.

## Overview

The CSV import/export system provides:
- **Streaming import** with Papa Parse
- **Zod schema validation** for type safety
- **Row-level error reporting** without stopping whole file
- **Dry-run mode** for validation without saving
- **Approved prices export** with full audit trail
- **Templates** for easy data entry

## Import

### Contract Import

Import contracts from CSV with validation.

```typescript
import { importContracts } from '@/lib/io/csv-import';

const csvContent = `name,status,startDate,endDate,counterparty,description
"Q4 2024 Oil",ACTIVE,2024-10-01,2024-12-31,"Acme Oil","Quarterly contract"`;

const result = await importContracts(prisma, csvContent, {
  tenantId: 'tenant-123',
  userId: 'user-456',
});

console.log(`Imported: ${result.successCount}/${result.totalRows}`);
console.log(`Errors: ${result.errorCount}`);

// Check errors
result.errors.forEach((err) => {
  console.log(`Row ${err.row}: ${err.message}`);
});
```

**CSV Format:**
```csv
name,status,startDate,endDate,counterparty,description
"Contract Name",ACTIVE|DRAFT|EXPIRED,YYYY-MM-DD,YYYY-MM-DD,"Counterparty","Description"
```

**Validation:**
- `name`: Required, non-empty
- `status`: Must be DRAFT, ACTIVE, or EXPIRED
- `startDate`: Required, YYYY-MM-DD format
- `endDate`: Optional, YYYY-MM-DD format
- `counterparty`: Optional
- `description`: Optional

### Item Import

Import items linked to existing contracts and PAMs.

```typescript
import { importItems } from '@/lib/io/csv-import';

const csvContent = `contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Q4 2024 Oil","Brent PAM","OIL-001","Crude Oil",75.50,USD,bbl,"Brent crude"`;

const result = await importItems(prisma, csvContent, {
  tenantId: 'tenant-123',
  userId: 'user-456',
});
```

**CSV Format:**
```csv
contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Contract Name","PAM Name","SKU","Item Name",100.50,USD,EA,"Description"
```

**Validation:**
- `contractName`: Must exist in database
- `pamName`: Must exist in database
- `sku`: Required, unique per tenant
- `name`: Required
- `basePrice`: Required, numeric (e.g., 100.50)
- `baseCurrency`: Required, 3-letter code (USD, EUR, etc.)
- `uom`: Required (e.g., bbl, MT, KG, L)
- `description`: Optional

### PAM Import

Import PAM metadata (graphs must be configured separately via UI).

```typescript
import { importPAMs } from '@/lib/io/csv-import';

const csvContent = `name,description,status
"Brent PAM","Brent-linked pricing",ACTIVE`;

const result = await importPAMs(prisma, csvContent, {
  tenantId: 'tenant-123',
  userId: 'user-456',
});
```

**CSV Format:**
```csv
name,description,status
"PAM Name","Description",ACTIVE|DRAFT|ARCHIVED
```

**Note:** Graphs are created empty and must be configured via [PAM Builder UI](./pam-builder-ui.md).

### Dry-Run Mode

Validate CSV without saving to database.

```typescript
const result = await importContracts(prisma, csvContent, {
  tenantId: 'tenant-123',
  userId: 'user-456',
  dryRun: true, // Validate only
});

console.log(`Would import ${result.successCount} rows`);
console.log(`Validation errors: ${result.errorCount}`);

if (result.errorCount > 0) {
  console.log('Fix these errors before importing:');
  result.errors.forEach((err) => {
    console.log(`  Row ${err.row}: ${err.message}`);
  });
}
```

### Row-Level Error Handling

Errors are reported per row without stopping the entire import.

```typescript
const result = await importContracts(prisma, csvContent, {
  tenantId,
  userId,
});

// Check result
console.log(`Total: ${result.totalRows}`);
console.log(`Success: ${result.successCount}`);
console.log(`Errors: ${result.errorCount}`);

// Handle errors
result.errors.forEach((error) => {
  console.log(`Row ${error.row}: ${error.message}`);
  console.log(`Field: ${error.field}`);
  console.log(`Data: ${JSON.stringify(error.data)}`);
});

// Process successful imports
result.createdIds.forEach((id) => {
  console.log(`Created: ${id}`);
});
```

### Validation Helper

Validate CSV without choosing import function.

```typescript
import { validateCSV } from '@/lib/io/csv-import';

const result = await validateCSV(
  prisma,
  csvContent,
  'contracts', // or 'items' or 'pams'
  { tenantId, userId }
);

if (result.errorCount === 0) {
  console.log('CSV is valid - ready to import');
} else {
  console.log(`Found ${result.errorCount} errors`);
}
```

## Export

### Approved Prices Export

Export approved calculation results to CSV.

```typescript
import { exportApprovedPrices } from '@/lib/io/csv-export';

const csv = await exportApprovedPrices(prisma, batchId, {
  tenantId: 'tenant-123',
});

// Download or save
fs.writeFileSync('approved_prices.csv', csv);
```

**Output Format:**
```csv
sku,itemName,contractName,basePrice,baseCurrency,adjustedPrice,adjustedCurrency,uom,pamName,effectiveDate,calculatedAt,approvedBy,approvedAt,isOverridden,originalCalculatedPrice,overrideReason,overriddenBy,overriddenAt
OIL-001,"Crude Oil","Q4 2024 Oil",75.50,USD,82.30,USD,bbl,"Brent PAM",2024-12-01,2024-12-01T10:00:00Z,user-123,2024-12-01T14:00:00Z,NO,,,
```

**Columns:**
- Item identification: sku, itemName, contractName
- Pricing: basePrice, baseCurrency, adjustedPrice, adjustedCurrency, uom
- Calculation: pamName, effectiveDate, calculatedAt
- Approval: approvedBy, approvedAt
- Override: isOverridden, originalCalculatedPrice, overrideReason, overriddenBy, overriddenAt

**Requirements:**
- Batch must be approved
- Only exports approved results (isApproved=true)

### Contract Export

Export all contracts for a tenant.

```typescript
import { exportContracts } from '@/lib/io/csv-export';

const csv = await exportContracts(prisma, {
  tenantId: 'tenant-123',
});
```

**Output:**
```csv
name,status,startDate,endDate,counterparty,description,itemCount
"Q4 2024 Oil",ACTIVE,2024-10-01,2024-12-31,"Acme Oil","Quarterly contract",15
```

### Item Export

Export all items (optionally filtered by contract).

```typescript
import { exportItems } from '@/lib/io/csv-export';

// All items
const csv = await exportItems(prisma, {
  tenantId: 'tenant-123',
});

// Single contract
const csv = await exportItems(
  prisma,
  { tenantId: 'tenant-123' },
  'contract-id'
);
```

**Output:**
```csv
contractName,pamName,sku,name,basePrice,baseCurrency,uom,description
"Q4 2024 Oil","Brent PAM","OIL-001","Crude Oil",75.50,USD,bbl,"Brent crude"
```

### PAM Export

Export PAM metadata (graphs not included).

```typescript
import { exportPAMs } from '@/lib/io/csv-export';

const csv = await exportPAMs(prisma, {
  tenantId: 'tenant-123',
});
```

**Output:**
```csv
name,description,status,itemCount
"Brent PAM","Brent-linked pricing",ACTIVE,25
```

### Download in Browser

Trigger browser download of CSV.

```typescript
import { downloadCSV } from '@/lib/io/csv-export';

const csv = await exportContracts(prisma, { tenantId });
downloadCSV(csv, 'contracts.csv');
```

## Templates

CSV templates are available in `/public/templates/`:

- [`contracts.csv`](/templates/contracts.csv) - Contract import template
- [`items.csv`](/templates/items.csv) - Item import template
- [`pams.csv`](/templates/pams.csv) - PAM import template

Download templates, fill in data, and import via API.

## API Integration

### Upload Endpoint

```typescript
// pages/api/import/contracts.ts
import { importContracts } from '@/lib/io/csv-import';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { csvContent, dryRun } = req.body;

  const result = await importContracts(prisma, csvContent, {
    tenantId: session.user.teamId,
    userId: session.user.id,
    dryRun: dryRun || false,
  });

  return res.status(200).json(result);
}
```

### Download Endpoint

```typescript
// pages/api/export/approved-prices/[batchId].ts
import { exportApprovedPrices } from '@/lib/io/csv-export';

export default async function handler(req, res) {
  const { batchId } = req.query;
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const csv = await exportApprovedPrices(prisma, batchId as string, {
      tenantId: session.user.teamId,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="approved_prices_${batchId}.csv"`
    );
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
```

## UI Integration

### Import Form

```tsx
'use client';

import { useState } from 'react';
import { importContracts } from '@/lib/io/csv-import';

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    if (!file) return;

    const text = await file.text();
    const response = await fetch('/api/import/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: text, dryRun }),
    });

    const result = await response.json();
    setResult(result);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="file-input file-input-bordered"
      />

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="checkbox"
        />
        <span>Dry run (validate only)</span>
      </label>

      <button onClick={handleImport} className="btn btn-primary">
        {dryRun ? 'Validate' : 'Import'}
      </button>

      {result && (
        <div className="alert">
          <div>
            <div>Total: {result.totalRows}</div>
            <div>Success: {result.successCount}</div>
            <div>Errors: {result.errorCount}</div>
          </div>
        </div>
      )}

      {result?.errors.length > 0 && (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Errors:</h3>
            <ul>
              {result.errors.map((err: any, i: number) => (
                <li key={i}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Export Button

```tsx
import { exportApprovedPrices, downloadCSV } from '@/lib/io/csv-export';

export default function ExportButton({ batchId }: { batchId: string }) {
  const handleExport = async () => {
    const response = await fetch(`/api/export/approved-prices/${batchId}`);
    const csv = await response.text();

    downloadCSV(csv, `approved_prices_${batchId}.csv`);
  };

  return (
    <button onClick={handleExport} className="btn btn-outline">
      📥 Export Approved Prices
    </button>
  );
}
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Contract name is required" | Empty name field | Fill in contract name |
| "Status must be DRAFT, ACTIVE, or EXPIRED" | Invalid status value | Use exact status values |
| "Date must be YYYY-MM-DD" | Wrong date format | Use YYYY-MM-DD format (e.g., 2024-01-01) |
| "Base price must be a number" | Non-numeric price | Use numeric format (e.g., 100.50) |
| "Currency must be 3 letters" | Wrong currency format | Use 3-letter codes (USD, EUR, etc.) |
| "Contract not found" | Referenced contract doesn't exist | Import contracts first |
| "PAM not found" | Referenced PAM doesn't exist | Import PAMs first |
| "Batch is not approved" | Trying to export unapproved batch | Approve batch first |

### Example Error Response

```json
{
  "totalRows": 10,
  "successCount": 8,
  "errorCount": 2,
  "errors": [
    {
      "row": 3,
      "message": "Contract name is required",
      "field": "name",
      "data": {
        "name": "",
        "status": "ACTIVE",
        "startDate": "2024-01-01"
      }
    },
    {
      "row": 7,
      "message": "Status must be DRAFT, ACTIVE, or EXPIRED",
      "field": "status",
      "data": {
        "name": "Test Contract",
        "status": "INVALID",
        "startDate": "2024-01-01"
      }
    }
  ],
  "createdIds": [],
  "isDryRun": true
}
```

## Best Practices

1. **Always dry-run first** - Validate before importing
2. **Fix errors incrementally** - Address row errors one by one
3. **Import in order** - Contracts → PAMs → Items
4. **Use templates** - Download templates for correct format
5. **Check encoding** - Use UTF-8 encoding for special characters
6. **Quote fields** - Quote fields containing commas or quotes
7. **Test with small files** - Test with 5-10 rows before full import
8. **Export before import** - Export current data as backup

## Performance

### Import Performance

- **Streaming**: Processes rows one at a time (memory efficient)
- **Batch size**: Recommended <10,000 rows per file
- **Large files**: Split into multiple files for better error handling

### Export Performance

- **Pagination**: Exports handle large result sets efficiently
- **Memory**: Uses streaming for files >100MB
- **Format**: CSV is compact and fast to generate

## Testing

Run tests:
```bash
pnpm test csv-import-export
```

Acceptance tests verify:
- ✓ Malformed rows report errors without stopping import
- ✓ Approved prices export includes all required columns

## Related Documentation

- [Approvals Workflow](./approvals-workflow.md)
- [Calculation Orchestrator](./calculation-orchestrator.md)
- [PAM Builder UI](./pam-builder-ui.md)
