import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useTeams from './useTeams';

export default function useIndexSeriesDetail(seriesId: string) {
  const { teams, isLoading: teamsLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    teamSlug && seriesId ? `/api/teams/${teamSlug}/index-series/${seriesId}` : null,
    fetcher
  );

  return {
    isLoading: teamsLoading || isLoading,
    isError: error,
    indexSeries: data?.indexSeries,
    mutate,
    teamSlug,
  };
}
