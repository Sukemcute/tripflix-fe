import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { recommendPublicPosts, searchPublicPosts } from './explore-search';
import { useApiSession } from './session';
import { socialApi } from './social';

export function useSocialPosts(
  kind: 'public' | 'mine' | 'bookmarks' = 'public',
  keyword = '',
  // Chỉ còn vlog: Reels lấy qua useReelsFeed (/v1/feed).
  postType?: 'vlog',
  // 'recommended': khi không có từ khoá, lấy bài gợi ý theo gu của discovery thay cho bài mới nhất.
  publicSource: 'latest' | 'recommended' = 'latest',
  options: { enabled?: boolean } = {},
) {
  const { user, isReady } = useApiSession();
  const client = useQueryClient();
  const queryKey = ['social', kind, user?.id, keyword, postType, publicSource];
  const isRecommendedFeed = kind === 'public' && !keyword && publicSource === 'recommended';
  return useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    enabled: (options.enabled ?? true) && isReady && (kind === 'public' || !!user),
    queryFn: ({ pageParam, signal }) =>
      kind === 'mine'
        ? socialApi.listMyPosts({ cursor: pageParam, ...(postType ? { post_type: postType } : {}) }, signal)
        : kind === 'bookmarks'
          ? socialApi.listBookmarks(pageParam, signal, postType)
          : keyword
            ? // Có từ khoá: tìm bằng discovery thay cho ILIKE của content. Discovery chưa có loại khớp đúng vlog
              // (post bỏ sót bài có lộ trình) nên tạm lọc sau khi lấy chi tiết.
              searchPublicPosts(keyword, pageParam, signal).then((page) =>
                postType ? { ...page, items: page.items.filter((post) => post.postType === postType) } : page,
              )
            : isRecommendedFeed
              ? recommendedPage(client, queryKey, pageParam) ?? recommendPublicPosts(pageParam, signal, postType)
              : socialApi.listPosts({ cursor: pageParam, ...(postType ? { post_type: postType } : {}) }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

type RecommendedPage = Awaited<ReturnType<typeof recommendPublicPosts>>;

/**
 * Trang gợi ý đã tải thì giữ nguyên khi bị làm mới (invalidate ['social'] sau bình luận, quay lại tab...).
 * Tải lại sẽ tính trang 1 theo gu mới nhưng các trang sau vẫn theo cursor cũ: trùng bài, và mỗi trang gọi lại 1 + 7 request.
 * Feed mới chỉ có khi mở lại trang; lượt thích, lưu, xoá vẫn cập nhật tại chỗ qua setQueriesData.
 */
export function recommendedPage(client: ReturnType<typeof useQueryClient>, queryKey: unknown[], pageParam: string | undefined) {
  const cached = client.getQueryData<InfiniteData<RecommendedPage, string | undefined>>(queryKey);
  const index = cached?.pageParams.indexOf(pageParam) ?? -1;
  return index >= 0 ? Promise.resolve(cached!.pages[index]!) : undefined;
}
