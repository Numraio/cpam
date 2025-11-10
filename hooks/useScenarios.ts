import useSWR from 'swr';
import useTeams from './useTeams';
import { fetcher } from '@/lib/common';

export default function useScenarios() {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    teamSlug ? `/api/teams/${teamSlug}/scenarios` : null,
    fetcher
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    scenarios: data?.scenarios,
    mutate,
    teamSlug,
  };
}
