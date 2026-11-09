import { useQuery } from '@tanstack/react-query';
import { exploreControllerSearch, exploreControllerSearchPosts } from './generated/core-api/discovery/discovery';
import type {
  ExploreResponseDto,
  SearchPostsRequestDto,
  SearchPostsResponseDto,
} from './generated/core-api/model';
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

/** Tìm bài (lộ trình, video, bài viết) bằng câu tự nhiên có phân trang (POST /api/search/posts). */
export async function getPostSearchResults(
  params: SearchPostsRequestDto,
  signal?: AbortSignal,
): Promise<SearchPostsResponseDto> {
  const response = await exploreControllerSearchPosts(params, { signal });
  return readEntity(response.data, ['understood', 'items', 'total', 'nextCursor']) as SearchPostsResponseDto;
}

/** Hook tìm bài trên app: dùng useQuery cache theo params */
export function usePostSearch(params: {
  q: string;
  postType?: SearchPostsRequestDto['postType'];
  cursor?: string | null;
  limit?: number;
}) {
  const { isReady } = useApiSession();
  const query = params.q.trim();
  return useQuery({
    queryKey: ['discovery', 'posts', query, params.postType ?? 'all', params.cursor ?? null, params.limit ?? 20],
    enabled: isReady && query.length > 0,
    queryFn: ({ signal }) =>
      getPostSearchResults(
        {
          q: query,
          postType: params.postType,
          cursor: params.cursor,
          limit: params.limit,
        },
        signal,
      ),
  });
}

