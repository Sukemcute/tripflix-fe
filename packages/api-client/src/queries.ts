import { useInfiniteQuery } from '@tanstack/react-query';
import { searchPublicPosts } from './explore-search';
import { useApiSession } from './session';
import { socialApi } from './social';

export function useSocialPosts(
  kind: 'public' | 'mine' | 'bookmarks' = 'public',
  keyword = '',
  // Chỉ còn vlog: Reels lấy qua useReelsFeed (/v1/feed).
  postType?: 'vlog',
  options: { enabled?: boolean } = {},
) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['social', kind, user?.id, keyword, postType],
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
            : socialApi.listPosts(
                { cursor: pageParam, ...(postType ? { post_type: postType } : {}) },
                signal,
              ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
