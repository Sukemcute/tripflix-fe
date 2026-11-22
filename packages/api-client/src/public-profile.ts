import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import { followsControllerGetProfile } from './generated/core-api/social-follows/social-follows';
import { readEntity, readPage } from './response';
import { authorVlogsQueryKey, publicProfileQueryKey } from './profile-query-keys';
import { socialApi } from './social';

export const getPublicProfileQueryKey = publicProfileQueryKey;

/** Tên, số theo dõi và tổng lượt thích của một người (không cần đăng nhập). */
export function usePublicProfile(userId?: string) {
  return useQuery({
    queryKey: getPublicProfileQueryKey(userId),
    enabled: !!userId,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) =>
      readEntity((await followsControllerGetProfile(userId!, { signal })).data, [
        'id',
        'displayName',
        'followerCount',
        'followingCount',
        'likeCount',
      ]),
  });
}

/** Reels của một người, mới nhất trước; thẻ có sẵn ảnh bìa và lượt thích. */
export function useAuthorReels(userId?: string) {
  return useInfiniteQuery({
    queryKey: ['feed', 'authorPages', userId],
    enabled: !!userId,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      readPage(
        (await feedControllerGetFeed({ author_id: userId, cursor: pageParam, limit: 20 }, { signal })).data,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

/** Bài viết (vlog) công khai của một người. */
export function useAuthorVlogs(userId?: string) {
  return useInfiniteQuery({
    queryKey: authorVlogsQueryKey(userId),
    enabled: !!userId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      socialApi.listPosts({ author_id: userId, post_type: 'vlog', cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
