import { useInfiniteQuery } from '@tanstack/react-query';
import { searchPublicPosts } from './explore-search';
import { useApiSession } from './session';
import { socialApi } from './social';

export function useSocialPosts(
  kind: 'public' | 'mine' | 'bookmarks' = 'public',
  keyword = '',
  postType?: 'video' | 'vlog',
) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['social', kind, user?.id, keyword, postType],
    initialPageParam: undefined as string | undefined,
    enabled: isReady && (kind === 'public' || !!user),
    queryFn: ({ pageParam, signal }) =>
      kind === 'mine'
        ? socialApi.listMyPosts({ cursor: pageParam }, signal)
        : kind === 'bookmarks'
          ? socialApi.listBookmarks(pageParam, signal)
          : keyword
            ? // Có từ khoá: tìm bằng discovery thay cho ILIKE của content; lọc loại bài sau khi lấy chi tiết.
              searchPublicPosts(keyword, pageParam, signal).then((page) =>
                postType ? { ...page, items: page.items.filter((post) => post.postType === postType) } : page,
              )
            : socialApi.listPosts({ cursor: pageParam, ...(postType ? { post_type: postType } : {}) }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
