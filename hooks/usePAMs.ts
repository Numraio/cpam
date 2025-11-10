import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useTeams from './useTeams';

export default function usePAMs() {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    teamSlug ? `/api/teams/${teamSlug}/pams` : null,
    fetcher
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    pams: data?.pams,
    mutate,
    teamSlug,
  };
}
