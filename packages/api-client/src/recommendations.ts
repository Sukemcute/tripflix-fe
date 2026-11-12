import { useQuery } from '@tanstack/react-query';
import { homeRecommendationsControllerRecommendForHome } from './generated/core-api/discovery/discovery';
import type {
  HomeDestinationPickDto,
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
): Promise<HomeDestinationPickDto[]> {
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

// Gợi ý trang chủ ít đổi: không tự làm mới theo chu kỳ hay khi quay lại cửa sổ (TF84).
export const HOME_RECOMMENDATIONS_REFRESH = {
  staleTime: 15 * 60 * 1000,
  refetchInterval: false,
  refetchOnWindowFocus: false,
} as const;

export function useHomeRecommendations(filters: HomeRecommendationsFilters = {}) {
  const { isReady } = useApiSession();
  const recentParam = (filters.recentPlaceIds ?? []).join(',');

  return useQuery({
    queryKey: ['discovery', 'home-recommendations', recentParam, filters.limit],
    enabled: isReady,
    ...HOME_RECOMMENDATIONS_REFRESH,
    queryFn: ({ signal }) => getHomeRecommendations(filters, signal),
  });
}
