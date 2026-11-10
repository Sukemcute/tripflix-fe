import { useInfiniteQuery } from '@tanstack/react-query';
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
          : socialApi.listPosts(
              {
                cursor: pageParam,
                ...(keyword ? { keyword } : {}),
                ...(postType ? { post_type: postType } : {}),
              },
              signal,
            ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
