import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useTeams from './useTeams';

export default function useCalculationDetail(calcId: string) {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    teamSlug && calcId ? `/api/teams/${teamSlug}/calculations/${calcId}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds for running calculations
    }
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    calculation: data?.calculation,
    results: data?.results,
    mutate,
    teamSlug,
  };
}
