# Price Math Report

Branded PDF and CSV reports showing detailed calculation breakdowns.

## Overview

Price Math Reports provide comprehensive documentation of pricing calculations including:
- Base prices and currencies
- Factor contributions
- Transform operations
- Currency conversions
- Controls applied (caps/floors/triggers)
- Final adjusted prices
- Approval status and overrides

## Report Formats

### PDF Report
- **Branded**: Tenant name, logo, colors
- **Paginated**: One item per page
- **Detailed**: Step-by-step calculations
- **Professional**: Print-ready formatting

### CSV Report
- **Summary**: One row per item
- **Detailed**: One row per calculation step
- **Machine-readable**: Import into Excel/BI tools

## API Usage

### Generate PDF

```typescript
GET /api/reports/price-math?batchId=xxx&format=pdf

// Response: PDF file download
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="price-math-{batchId}.pdf"
```

### Generate CSV (Summary)

```typescript
GET /api/reports/price-math?batchId=xxx&format=csv

// Response: CSV file download
// Columns: sku, itemName, contractName, basePrice, adjustedPrice, etc.
```

### Generate CSV (Detailed)

```typescript
GET /api/reports/price-math?batchId=xxx&format=csv&detailed=true

// Response: CSV with calculation steps
// Columns: sku, step, operation, description, output, etc.
```

### Filter to Single Item

```typescript
GET /api/reports/price-math?batchId=xxx&itemId=yyy&format=pdf

// Generates report for single item only
```

## Programmatic Usage

### Fetch Report Data

```typescript
import { fetchReportData } from '@/lib/reports/price-math-report';

const data = await fetchReportData(prisma, {
  tenantId: 'tenant-123',
  batchId: 'batch-456',
  itemId: 'item-789', // Optional: filter to one item
});

// data structure:
{
  batch: {
    id: string;
    pamName: string;
    asOfDate: string;
    status: string;
    approvedBy?: string;
    approvedAt?: Date;
  },
  items: [
    {
      sku: string;
      itemName: string;
      basePrice: number;
      contributions: [...],
      adjustedPrice: number;
      isApproved: boolean;
      isOverridden: boolean;
    }
  ],
  metadata: {
    totalItems: number;
    generatedAt: Date;
  }
}
```

### Generate PDF

```typescript
import { generatePDF } from '@/lib/reports/price-math-report';

const pdfStream = generatePDF(data, {
  tenantName: 'Acme Corp',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
});

// Pipe to response
pdfStream.pipe(res);

// Or save to file
pdfStream.pipe(fs.createWriteStream('report.pdf'));
```

### Generate CSV

```typescript
import { generateCSV, generateDetailedCSV } from '@/lib/reports/price-math-report';

// Summary CSV
const csv = generateCSV(data);

// Detailed CSV with calculation steps
const detailedCsv = generateDetailedCSV(data);

// Write to file or return as response
fs.writeFileSync('report.csv', csv);
```

## Branding Options

Customize reports with tenant branding:

```typescript
interface BrandingOptions {
  tenantName?: string; // Appears in header
  logoUrl?: string; // Logo image (not yet implemented)
  primaryColor?: string; // Hex color for headings
  secondaryColor?: string; // Hex color for text
}

const branding: BrandingOptions = {
  tenantName: 'Acme Corp',
  primaryColor: '#dc2626', // red
  secondaryColor: '#9ca3af', // gray
};

const pdfStream = generatePDF(data, branding);
```

## PDF Report Structure

### Page 1: Batch Summary
- Tenant name (header)
- Generation timestamp
- PAM name
- As-of date
- Status
- Approval information
- Total items

### Page 2+: Item Details (one per page)
- SKU and item name
- Contract name
- Base price with currency
- **Calculation Steps**:
  - Step-by-step breakdown
  - Operation type
  - Input → Output
  - Description
- Final adjusted price
- Override indicator (if applicable)
- Approval indicator

### Footer (all pages)
- Batch ID
- Page numbers

## CSV Report Structures

### Summary CSV

```csv
sku,itemName,contractName,basePrice,baseCurrency,adjustedPrice,adjustedCurrency,isApproved,isOverridden,overrideReason,calculationSteps
OIL-001,Crude Oil,Q4 Contract,100.00,USD,105.50,USD,YES,NO,,3
OIL-002,WTI,Q4 Contract,98.00,USD,103.32,USD,YES,NO,,3
```

### Detailed CSV

```csv
sku,itemName,contractName,step,operation,description,output,basePrice,adjustedPrice,isApproved
OIL-001,Crude Oil,Q4 Contract,Step 1,factor,Factor: 1.05,105.00,100.00,,YES
OIL-001,Crude Oil,Q4 Contract,Step 2,multiply,Multiply by 1.01,106.05,,,YES
OIL-001,Crude Oil,Q4 Contract,Step 3,controls,Apply controls,105.50,,105.50,YES
```

## Use Cases

### 1. External Audit

```typescript
// Generate comprehensive report for auditors
const data = await fetchReportData(prisma, {
  tenantId,
  batchId: approvedBatchId,
});

const pdfStream = generatePDF(data, {
  tenantName: 'Acme Corp',
});

// Email to auditor or save to secure location
```

### 2. Customer Transparency

```typescript
// Show customer how their price was calculated
const data = await fetchReportData(prisma, {
  tenantId,
  batchId,
  itemId: customerItemId, // Single item
});

const pdfStream = generatePDF(data, branding);
// Attach to email
```

### 3. Internal Review

```typescript
// Export to CSV for analysis in Excel
const csv = generateDetailedCSV(data);

// Analyst can review step-by-step calculations
// Compare across batches
// Identify anomalies
```

### 4. Compliance Archive

```typescript
// Generate monthly report for compliance
const monthlyBatches = await getApprovedBatches(month);

for (const batch of monthlyBatches) {
  const data = await fetchReportData(prisma, {
    tenantId,
    batchId: batch.id,
  });

  const pdf = generatePDF(data, branding);
  await saveToArchive(pdf, `${month}/${batch.id}.pdf`);
}
```

## Calculation Steps Included

Reports show all calculation steps:

1. **Factor Nodes**: Index values and lookups
2. **Transform Nodes**: Mathematical operations
3. **Convert Nodes**: Currency conversions
4. **Combine Nodes**: Aggregation operations
5. **Controls Nodes**: Caps, floors, trigger bands

Example:
```
Step 1: Factor: WTI Index = 75.50
Step 2: Multiply by contract multiplier (1.05) = 79.28
Step 3: Currency conversion USD → EUR = 72.15
Step 4: Apply cap (+5%) = 73.50
```

## Performance

- **Target**: Generate within 3 seconds
- **Optimization**: Server-side rendering (no browser needed)
- **Streaming**: PDF streamed directly to response
- **Pagination**: Large batches handled efficiently

## Deterministic Output

Reports are deterministic (except timestamp):
- Same input → Same output
- Byte-identical on repeated generation
- Reproducible for compliance

## Best Practices

1. **Generate After Approval**: Only generate for approved batches
2. **Archive Reports**: Store PDFs for compliance
3. **Include Timestamp**: Always include generation timestamp
4. **Brand Consistently**: Use same branding across all reports
5. **Test Output**: Verify CSV imports correctly into Excel

## API Examples

### cURL

```bash
# PDF
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/reports/price-math?batchId=xxx&format=pdf" \
  -o report.pdf

# CSV
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/reports/price-math?batchId=xxx&format=csv" \
  -o report.csv
```

### JavaScript

```javascript
// PDF
const response = await fetch('/api/reports/price-math?batchId=xxx&format=pdf');
const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url); // Open in new tab

// CSV
const response = await fetch('/api/reports/price-math?batchId=xxx&format=csv');
const csv = await response.text();
console.log(csv);
```

## Future Enhancements

- Logo upload and embedding
- Custom page layouts
- Chart/graph visualizations
- Multi-batch comparison reports
- Email delivery
- Scheduled generation

## Related Documentation

- [Calculation Orchestrator](./calculation-orchestrator.md)
- [Contributions Waterfall](./contributions-waterfall.md)
- [Approvals Workflow](./approvals-workflow.md)
