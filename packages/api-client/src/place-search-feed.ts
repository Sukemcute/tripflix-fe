import { useInfiniteQuery } from '@tanstack/react-query';
import { exploreControllerSearchPlaces } from './generated/core-api/discovery/discovery';
import type { SearchPlacesRequestDtoKind, SearchPlacesResponseDto } from './generated/core-api/model';
import { readEntity } from './response';
import { useApiSession } from './session';

export type PlaceSearchKind = SearchPlacesRequestDtoKind;

/** Số mục mỗi trang của tab khách sạn, địa điểm, quán: vừa 2 hàng grid như tab bài. */
export const PLACE_SEARCH_PAGE_SIZE = 12;

/** Một trang tìm một loại chỗ, điểm (POST /api/search/places), giữ thứ tự xếp hạng của discovery. */
export async function getPlaceSearchResults(
  params: { q: string; kind: PlaceSearchKind; cursor?: string; limit?: number },
  signal?: AbortSignal,
): Promise<SearchPlacesResponseDto> {
  const response = await exploreControllerSearchPlaces({ limit: PLACE_SEARCH_PAGE_SIZE, ...params }, { signal });
  return readEntity(response.data, ['understood', 'items', 'total', 'nextCursor']) as SearchPlacesResponseDto;
}

/** Kết quả một loại theo từ khoá đã chốt, có phân trang. POST nhưng chỉ đọc nên dùng query, cache theo câu và loại. */
export function usePlaceSearchFeed(keyword: string, kind: PlaceSearchKind | null) {
  const { isReady } = useApiSession();
  const query = keyword.trim();
  return useInfiniteQuery({
    queryKey: ['discovery', 'places', query, kind] as const,
    enabled: isReady && query.length > 0 && kind !== null,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getPlaceSearchResults({ q: query, kind: kind!, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
