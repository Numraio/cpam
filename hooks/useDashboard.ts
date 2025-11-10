import useSWR from 'swr';
import { fetcher } from '@/lib/common';

export function useDashboardKPIs() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/kpis',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
    }
  );

  return {
    kpis: data?.kpis,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useDashboardActivity(limit = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/activity?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    activity: data?.activity || [],
    isLoading,
    isError: error,
    mutate,
  };
}
