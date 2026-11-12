import { useQuery } from '@tanstack/react-query';
import { exploreControllerSearch, exploreControllerSearchPosts } from './generated/core-api/discovery/discovery';
import { userSearchControllerSearch } from './generated/core-api/users/users';
import type {
  ExploreResponseDto,
  SearchPostsRequestDto,
  SearchPostsResponseDto,
  UserSearchResponseDto,
} from './generated/core-api/model';
import { readEntity } from './response';
import { useApiSession } from './session';
import { socialApi } from './social';

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

/** Số bài mỗi trang khi tìm theo từ khoá: mỗi bài cần thêm một lần lấy chi tiết nên giữ nhỏ. */
export const KEYWORD_SEARCH_PAGE_SIZE = 10;

/**
 * Tìm bài công khai bằng engine của discovery (hiểu câu, bỏ dấu, sửa gõ, ghép/tách chữ), rồi lấy chi tiết từng bài
 * theo đúng thứ tự xếp hạng. Trả cùng dạng trang với socialApi.listPosts nên viewer dùng lại được.
 * Bài đã ẩn/xoá giữa hai lần gọi (chi tiết lỗi) thì bỏ qua thay vì làm hỏng cả trang.
 */
export async function searchPublicPosts(keyword: string, cursor?: string, signal?: AbortSignal) {
  const found = await getPostSearchResults({ q: keyword, cursor, limit: KEYWORD_SEARCH_PAGE_SIZE }, signal);
  const details = await Promise.all(
    found.items.map((item) =>
      socialApi.getPost(item.refId, signal).then(
        (detail) => detail.post,
        () => null,
      ),
    ),
  );
  return { items: details.filter((post) => post !== null), nextCursor: found.nextCursor };
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

/** Tìm người dùng công khai theo tên hiển thị, gõ không dấu vẫn ra (GET /api/v1/users/search). */
export async function searchUsers(q: string, page = 1, signal?: AbortSignal): Promise<UserSearchResponseDto> {
  const response = await userSearchControllerSearch({ q, page }, { signal });
  return readEntity(response.data, ['items', 'page', 'hasMore']) as UserSearchResponseDto;
}

export function useUserSearch(q: string) {
  const { isReady } = useApiSession();
  const query = q.trim();
  return useQuery({
    queryKey: ['discovery', 'users', query],
    enabled: isReady && query.length > 0,
    queryFn: ({ signal }) => searchUsers(query, 1, signal),
  });
}
