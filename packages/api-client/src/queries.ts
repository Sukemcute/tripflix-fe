import { useInfiniteQuery } from '@tanstack/react-query';
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
) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['social', kind, user?.id, keyword, postType, publicSource],
    initialPageParam: undefined as string | undefined,
    enabled: isReady && (kind === 'public' || !!user),
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
            : publicSource === 'recommended'
              ? recommendPublicPosts(pageParam, signal, postType)
              : socialApi.listPosts({ cursor: pageParam, ...(postType ? { post_type: postType } : {}) }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
