import { useQuery } from '@tanstack/react-query';
import { exploreControllerSearch } from './generated/core-api/discovery/discovery';
import type { ExploreResponseDto } from './generated/core-api/model';
import { readEntity } from './response';
import { useApiSession } from './session';

/** Tìm khám phá bằng câu tự nhiên (POST /api/search): kết quả chia vùng Ở đâu, Lộ trình, Bài viết, Video. */
export async function getExploreResults(q: string, signal?: AbortSignal): Promise<ExploreResponseDto> {
  const response = await exploreControllerSearch({ q }, { signal });
  return readEntity(response.data, ['understood', 'sections', 'suggest', 'dropped']) as ExploreResponseDto;
}

/** POST nhưng chỉ đọc: dùng query (cache theo câu) thay cho mutation orval sinh ra. */
export function useExploreSearch(q: string) {
  const { isReady } = useApiSession();
  const query = q.trim();
  return useQuery({
    queryKey: ['discovery', 'explore', query],
    enabled: isReady && query.length > 0,
    queryFn: ({ signal }) => getExploreResults(query, signal),
  });
}
