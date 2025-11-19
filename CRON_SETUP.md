# BLS Daily Sync Cron Job

This application automatically syncs BLS (Bureau of Labor Statistics) data daily using a scheduled cron job.

## How It Works

1. **Cron Schedule**: Runs daily at midnight UTC (defined in `vercel.json`)
2. **Endpoint**: `/api/cron/bls-daily-sync`
3. **Action**: Fetches the latest year of data for all BLS IndexSeries across all tenants
4. **Smart Sync**: Only inserts new data points, skips existing ones

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Cron job secret for authentication
CRON_SECRET=your-secure-random-string-here
```

### Vercel Deployment

The cron job is automatically configured via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/bls-daily-sync",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight UTC. Vercel Cron automatically handles authentication.

## Local Testing

To test the cron job locally:

```bash
# Set the CRON_SECRET in your .env
CRON_SECRET=dev-secret

# Call the endpoint with curl
curl -X POST http://localhost:4002/api/cron/bls-daily-sync \
  -H "Authorization: Bearer dev-secret"
```

## Manual Trigger (Production)

If you need to manually trigger the sync in production:

```bash
curl -X POST https://your-domain.com/api/cron/bls-daily-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring

Check your Vercel logs to monitor cron job execution:
- Navigate to your Vercel project
- Go to "Logs" tab
- Filter by `/api/cron/bls-daily-sync`

You'll see output like:
```
[CRON] Starting daily BLS sync for 15 series
[CRON] ✓ Synced CUUR0000SA0: 12 new, 353 skipped
[CRON] ✓ Synced PCU3331313331319: 1 new, 527 skipped
[CRON] Daily BLS sync completed: 15 success, 0 errors
```

## Troubleshooting

### Cron Not Running
- Verify `vercel.json` is committed and deployed
- Check Vercel dashboard → Settings → Crons to see if it's registered
- Ensure your plan supports cron jobs (Hobby plan has limits)

### Authentication Errors
- Verify `CRON_SECRET` environment variable is set in Vercel
- Check that the secret matches in both `.env` and Vercel settings

### Sync Failures
- Check API logs for specific error messages
- Verify BLS API is accessible from your deployment region
- Check database connection and Prisma client status
