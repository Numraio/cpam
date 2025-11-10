import useSWR from 'swr';
import useTeams from './useTeams';
import { fetcher } from '@/lib/common';

export default function useScenarioDetail(scenarioId?: string) {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate} = useSWR(
    teamSlug && scenarioId ? `/api/teams/${teamSlug}/scenarios/${scenarioId}` : null,
    fetcher
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    scenario: data?.scenario,
    mutate,
    teamSlug,
  };
}
