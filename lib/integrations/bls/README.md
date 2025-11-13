# BLS (Bureau of Labor Statistics) Integration

Integration with the U.S. Bureau of Labor Statistics API for automated index data ingestion.

## Overview

This integration allows CPAM to automatically fetch economic indices from BLS including:
- **CPI** (Consumer Price Index)
- **PPI** (Producer Price Index)
- **ECI** (Employment Cost Index)
- **Import/Export Price Indexes**

## Setup

### 1. Register for BLS API Key (Optional but Recommended)

- Free tier: 500 requests/day
- Registered tier: 1,000 requests/day
- Register at: https://data.bls.gov/registrationEngine/

### 2. Configure Environment Variable

Add to `.env`:

```bash
BLS_API_KEY=your_api_key_here
```

**Note:** API key is optional. Without it, you're limited to 500 requests/day.

### 3. Available Series

See [series-catalog.ts](./series-catalog.ts) for a complete list of available BLS series.

Common series:
- `CUUR0000SA0` - CPI-U: All Items (Seasonally Adjusted)
- `CUUR0000SA0L1E` - CPI-U: Core (ex. food & energy)
- `CUUR0000SA0E` - CPI-U: Energy
- `WPU0561` - PPI: Crude Petroleum
- `CIU2010000000000A` - ECI: Total Compensation

## Usage

### API Client

```typescript
import { blsClient } from '@/lib/integrations/bls';

// Fetch latest data
const series = await blsClient.fetchLatestData('CUUR0000SA0');

// Fetch historical data (last 10 years)
const historicalSeries = await blsClient.fetchHistoricalData('CUUR0000SA0', 10);

// Fetch specific date range
const rangeSeries = await blsClient.fetchSeries(
  ['CUUR0000SA0'],
  '2020',
  '2024'
);
```

### Data Mapping

```typescript
import { parseBLSSeries, mapBLSSeriesToIndexValues } from '@/lib/integrations/bls';

// Parse BLS data points
const parsedData = parseBLSSeries(series);

// Map to IndexValue records for database insertion
const indexValues = mapBLSSeriesToIndexValues(series, 'indexSeriesId');
```

### Series Catalog

```typescript
import {
  BLS_SERIES_CATALOG,
  getCPISeries,
  searchSeries,
  getSeriesById,
} from '@/lib/integrations/bls';

// Get all CPI series
const cpiSeries = getCPISeries();

// Search by keyword
const energySeries = searchSeries('energy');

// Get series by ID
const series = getSeriesById('CUUR0000SA0');
```

## API Endpoints

### GET /api/integrations/bls/series

Get catalog of available BLS series.

**Response:**
```json
{
  "data": [
    {
      "value": "CUUR0000SA0",
      "label": "CPI-U: All Items",
      "description": "Consumer Price Index for All Urban Consumers...",
      "category": "CPI"
    }
  ],
  "count": 20
}
```

### POST /api/integrations/bls/preview

Preview BLS series data before importing.

**Request:**
```json
{
  "seriesId": "CUUR0000SA0",
  "yearsBack": 2
}
```

**Response:**
```json
{
  "data": {
    "seriesId": "CUUR0000SA0",
    "metadata": {
      "title": "CPI-U: All Items",
      "seasonallyAdjusted": true,
      "surveyName": "Consumer Price Index"
    },
    "dataPoints": [
      {
        "date": "2024-03-01",
        "value": 312.230,
        "period": "M03",
        "year": "2024"
      }
    ],
    "count": 24,
    "dateRange": {
      "start": "2022-03-01",
      "end": "2024-03-01"
    }
  }
}
```

## Rate Limiting

- **Without API Key:** 500 requests/day
- **With API Key:** 1,000 requests/day
- Rate limit resets at midnight EST

Check rate limit:
```typescript
const rateLimitInfo = blsClient.getRateLimitInfo();
console.log(`${rateLimitInfo.requestsToday}/${rateLimitInfo.dailyLimit} requests used`);
```

## Data Frequency

BLS data comes in different frequencies:
- **Monthly:** CPI, PPI (most common)
- **Quarterly:** Employment Cost Index
- **Annual:** Some aggregate statistics

Period formats:
- `M01`-`M12`: January-December
- `Q01`-`Q04`: Quarters 1-4
- `A01`: Annual

## Error Handling

```typescript
try {
  const series = await blsClient.fetchLatestData('INVALID_SERIES');
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limit exceeded
  } else if (error.message.includes('No data found')) {
    // Handle invalid series ID
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Use API Key:** Register for higher rate limits
2. **Cache Responses:** BLS data updates monthly, cache aggressively
3. **Batch Requests:** Fetch multiple series in one request when possible
4. **Handle Revisions:** BLS occasionally revises past values
5. **Monitor Rate Limits:** Track daily usage to avoid hitting limits

## Testing

Run integration tests:
```bash
npm test lib/integrations/bls
```

## References

- BLS API Documentation: https://www.bls.gov/developers/
- API Registration: https://data.bls.gov/registrationEngine/
- Series ID Formats: https://www.bls.gov/help/hlpforma.htm
- Data Release Schedule: https://www.bls.gov/schedule/

## Future Enhancements

- [ ] Automated scheduled ingestion (daily/weekly jobs)
- [ ] Data revision handling
- [ ] Historical backfill on series creation
- [ ] UI for series selection and preview
- [ ] Webhook notifications for new data
- [ ] Advanced caching strategy
