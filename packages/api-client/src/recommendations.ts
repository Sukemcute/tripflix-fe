import { useQuery } from '@tanstack/react-query';
import { homeRecommendationsControllerRecommendForHome } from './generated/core-api/discovery/discovery';
import type {
  HomePickDto,
  HomeRecommendationsControllerRecommendForHomeParams,
} from './generated/core-api/model';
import { useApiSession } from './session';

export interface HomeRecommendationsFilters {
  recentPlaceIds?: string[];
  limit?: number;
}

export async function getHomeRecommendations(
  filters: HomeRecommendationsFilters = {},
  signal?: AbortSignal,
): Promise<HomePickDto[]> {
  const params: HomeRecommendationsControllerRecommendForHomeParams = {};
  if (filters.recentPlaceIds && filters.recentPlaceIds.length > 0) {
    params.recentPlaceIds = filters.recentPlaceIds.join(',');
  }
  if (filters.limit) {
    params.limit = filters.limit;
  }

  const response = await homeRecommendationsControllerRecommendForHome(params, { signal });
  return response.data?.items ?? [];
}

export function useHomeRecommendations(filters: HomeRecommendationsFilters = {}) {
  const { isReady } = useApiSession();
  const recentParam = (filters.recentPlaceIds ?? []).join(',');

  return useQuery({
    queryKey: ['discovery', 'home-recommendations', recentParam, filters.limit],
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: ({ signal }) => getHomeRecommendations(filters, signal),
  });
}
