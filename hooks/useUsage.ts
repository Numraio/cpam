/**
 * Hook: useUsage
 *
 * Fetches and caches team usage and entitlements
 */

import useSWR from 'swr';
import type { ApiResponse } from 'types';

interface UsageData {
  usage: {
    itemsUnderManagement: number;
    lastUpdated: string | null;
  };
  entitlements: {
    maxItemsUnderManagement: number | null;
    planName: string | null;
    active: boolean;
  };
  metrics: {
    percentageUsed: number;
    warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    remaining: number | null;
    canAddMore: boolean;
  };
}

export function useUsage(teamSlug: string) {
  const { data, error, mutate } = useSWR<ApiResponse<UsageData>>(
    teamSlug ? `/api/teams/${teamSlug}/usage` : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch usage');
      }
      return res.json();
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  return {
    usage: data?.usage,
    entitlements: data?.entitlements,
    metrics: data?.metrics,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
