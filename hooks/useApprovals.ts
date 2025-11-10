import useSWR from 'swr';
import { fetcher } from '@/lib/common';

export function useApprovals(status = 'PENDING') {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/approvals?status=${status}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    approvals: data?.approvals || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useApprovalDetail(approvalId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    approvalId ? `/api/approvals/${approvalId}` : null,
    fetcher
  );

  return {
    approval: data?.approval,
    isLoading,
    isError: error,
    mutate,
  };
}
