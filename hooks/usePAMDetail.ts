import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useTeams from './useTeams';

export default function usePAMDetail(pamId: string) {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    teamSlug && pamId ? `/api/teams/${teamSlug}/pams/${pamId}` : null,
    fetcher
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    pam: data?.pam,
    mutate,
    teamSlug,
  };
}
