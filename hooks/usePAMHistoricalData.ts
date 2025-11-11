import useSWR from 'swr';
import { useRouter } from 'next/router';
import { fetcher } from '@/lib/common';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface NormalizedValue {
  date: string;
  actualValue: number;
  normalizedValue: number;
}

export interface SeriesData {
  seriesCode: string;
  seriesName: string;
  values: NormalizedValue[];
}

export interface HistoricalDataResponse {
  componentData: SeriesData[];
  mechanismData: NormalizedValue[];
  auditTrail: AuditTrailEntry[];
  averagingRule?: string;
}

export interface AuditTrailEntry {
  date: string;
  mechanismIndexValue: number;
  componentName: string;
  actualValue: number;
  normalizedValue: number;
}

export default function usePAMHistoricalData(
  pamId: string,
  dateRange: DateRange | null,
  baselineDate: Date | null,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' = 'MONTHLY'
) {
  const router = useRouter();
  const teamSlug = router.query.slug as string;

  // Build query params
  const params = new URLSearchParams();
  if (dateRange) {
    params.set('startDate', dateRange.start.toISOString());
    params.set('endDate', dateRange.end.toISOString());
  }
  if (baselineDate) {
    params.set('baselineDate', baselineDate.toISOString());
  }
  params.set('frequency', frequency);

  const url =
    pamId && dateRange && baselineDate
      ? `/api/teams/${teamSlug}/pams/${pamId}/historical-data?${params.toString()}`
      : null;

  const { data, error, mutate } = useSWR<HistoricalDataResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      // Cache historical data for 10 minutes (it doesn't change frequently)
      dedupingInterval: 600000,
    }
  );

  return {
    data,
    isLoading: !error && !data && url !== null,
    isError: error,
    mutate,
  };
}
