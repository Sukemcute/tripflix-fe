import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostSearchResults } from './explore-search';
import type { SearchPostsRequestDtoPostType, SocialPostDto } from './generated/core-api/model';
import { useApiSession } from './session';
import { socialApi } from './social';

/** Số bài mỗi trang kết quả: mỗi bài cần thêm một lần lấy chi tiết nên giữ nhỏ, vừa 2 hàng grid. */
export const POST_SEARCH_FEED_PAGE_SIZE = 12;

export interface PostSearchFeedPage {
  /** Bài đầy đủ như /v1/posts (kèm viewerContext) để các chỗ cập nhật cache theo `items` dùng chung được. */
  items: SocialPostDto[];
  nextCursor: string | null;
  /** Ảnh bìa discovery trả theo id bài; tách riêng để `items` giữ đúng dạng SocialPostDto. */
  thumbnails: Record<string, string | null>;
}

export interface PostSearchFeedOptions {
  /** Không truyền là mọi loại (Reels lẫn bài viết); `video` chỉ Reels. */
  postType?: SearchPostsRequestDtoPostType;
  cursor?: string;
  signal?: AbortSignal;
}

/**
 * Một trang kết quả tìm bài bằng engine discovery, giữ đúng thứ tự xếp hạng.
 * Bài đã ẩn/xoá giữa hai lần gọi (chi tiết lỗi) thì bỏ qua thay vì làm hỏng cả trang.
 */
export async function searchPostFeedPage(
  keyword: string,
  { postType, cursor, signal }: PostSearchFeedOptions = {},
): Promise<PostSearchFeedPage> {
  const found = await getPostSearchResults(
    { q: keyword, cursor, limit: POST_SEARCH_FEED_PAGE_SIZE, ...(postType ? { postType } : {}) },
    signal,
  );
  const thumbnails: Record<string, string | null> = {};
  const details = await Promise.all(
    found.items.map((hit) =>
      socialApi.getPost(hit.refId, signal).then(
        (detail): SocialPostDto | null => {
          thumbnails[detail.post.id] = hit.thumbnail;
          // Chi tiết trả viewerContext ở ngoài bài: gắn vào để trạng thái thích/lưu đúng như ở luồng bài.
          return { ...detail.post, viewerContext: detail.viewerContext ?? detail.post.viewerContext ?? null };
        },
        (): SocialPostDto | null => null,
      ),
    ),
  );
  return {
    items: details.filter((post): post is SocialPostDto => post !== null),
    nextCursor: found.nextCursor,
    thumbnails,
  };
}

export function getPostSearchFeedQueryKey(
  keyword: string,
  userId: string | null | undefined,
  postType: SearchPostsRequestDtoPostType = 'all',
) {
  return ['social', 'search', userId ?? null, keyword, postType] as const;
}

/**
 * Kết quả tìm bài theo từ khoá đã chốt (nhấn Enter), có phân trang. Grid kết quả và tab Bài viết dùng chung
 * một query nên mở bài từ grid không phải tìm lại.
 */
export function usePostSearchFeed(keyword: string, postType?: SearchPostsRequestDtoPostType) {
  const { user, isReady } = useApiSession();
  const query = keyword.trim();
  return useInfiniteQuery({
    queryKey: getPostSearchFeedQueryKey(query, user?.id, postType),
    enabled: isReady && query.length > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => searchPostFeedPage(query, { postType, cursor: pageParam, signal }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
