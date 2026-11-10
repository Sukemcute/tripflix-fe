import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedPageDto, SocialPostPageDto } from './generated/core-api/model';

/** Bỏ bài 404 khỏi mọi tab feed và danh sách social đang cache, giữ nguyên cursor. */
export function removeUnavailablePost(client: QueryClient, postId: string) {
  client.setQueriesData<InfiniteData<FeedPageDto>>(
    { queryKey: ['feed'] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.postId !== postId),
        })),
      },
  );
  client.setQueriesData<InfiniteData<SocialPostPageDto>>(
    {
      queryKey: ['social'],
      predicate: (query) => ['public', 'mine', 'bookmarks', 'posts'].includes(String(query.queryKey[1])),
    },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.id !== postId),
        })),
      },
  );
}
