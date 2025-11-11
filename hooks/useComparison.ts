import useSWR from 'swr';
import { useRouter } from 'next/router';
import { fetcher } from '@/lib/common';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ComparisonInsights {
  averageDifference: number;
  maxDivergence: {
    date: string;
    value: number;
    mechanismFavored: 'A' | 'B';
  };
}

export interface BreakdownRow {
  detail: string;
  mechanismA: string | number;
  mechanismB: string | number;
  isDifferent: boolean;
}

export interface ComparisonChartData {
  date: string;
  mechanismA: number;
  mechanismB: number;
  difference: number;
}

export interface ComparisonResult {
  chartData: ComparisonChartData[];
  breakdownData: BreakdownRow[];
  insights: ComparisonInsights;
}

export default function useComparison(
  mechanismAId: string | null,
  mechanismBId: string | null,
  dateRange: DateRange | null,
  anchorProduct: string | null,
  currency: string = 'USD'
) {
  const router = useRouter();
  const teamSlug = router.query.slug as string;

  // Build query params
  const params = new URLSearchParams();
  if (mechanismAId) params.set('mechanismA', mechanismAId);
  if (mechanismBId) params.set('mechanismB', mechanismBId);
  if (dateRange) {
    params.set('startDate', dateRange.start.toISOString());
    params.set('endDate', dateRange.end.toISOString());
  }
  if (anchorProduct) params.set('anchorProduct', anchorProduct);
  params.set('currency', currency);

  const url =
    mechanismAId && mechanismBId && dateRange && anchorProduct && teamSlug
      ? `/api/teams/${teamSlug}/comparator/compare?${params.toString()}`
      : null;

  const { data, error, mutate, isLoading } = useSWR<ComparisonResult>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      // Cache comparisons for 1 hour
      dedupingInterval: 3600000,
    }
  );

  return {
    data,
    isLoading: isLoading || (!error && !data && url !== null),
    isError: error,
    mutate,
  };
}
