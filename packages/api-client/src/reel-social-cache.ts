import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { FeedPageDto } from './generated/core-api/model/feedPageDto';
import type { socialApi } from './social';

type PostDetail = Awaited<ReturnType<typeof socialApi.getPost>>;
export type ReelSocialAction = 'like' | 'save';

/** Patch only this viewer/post; keep page order, cursors and video objects intact. */
export function updateReelSocialCache(
  client: QueryClient,
  userId: string,
  postId: string,
  action: ReelSocialAction,
  selected: boolean,
) {
  const feedKey = ['feed', 'for_you', userId];
  const detailKey = ['social', 'post', postId, userId];
  const previousFeed = client.getQueryData<InfiniteData<FeedPageDto>>(feedKey);
  const previousDetail = client.getQueryData<PostDetail>(detailKey);
  const flag = action === 'like' ? 'liked' : 'saved';
  const count = action === 'like' ? 'likes' : 'saves';
  const detailCount = action === 'like' ? 'reactionTotal' : 'bookmarkCount';

  client.setQueryData<InfiniteData<FeedPageDto>>(
    feedKey,
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((card) =>
            card.postId !== postId
              ? card
              : {
                  ...card,
                  viewerState: { liked: false, saved: false, ...card.viewerState, [flag]: selected },
                  counts: {
                    ...card.counts,
                    [count]: Math.max(
                      0,
                      card.counts[count] + Number(selected) - Number(!!card.viewerState?.[flag]),
                    ),
                  },
                },
          ),
        })),
      },
  );
  client.setQueryData<PostDetail>(detailKey, (data) => {
    if (!data) return data;
    const wasSelected =
      action === 'like' ? data.viewerContext.myReaction !== null : data.viewerContext.isBookmarked;
    return {
      ...data,
      post: {
        ...data.post,
        [detailCount]: Math.max(0, data.post[detailCount] + Number(selected) - Number(wasSelected)),
      },
      viewerContext: {
        ...data.viewerContext,
        ...(action === 'like'
          ? { myReaction: selected ? ('like' as const) : null }
          : { isBookmarked: selected }),
      },
    };
  });

  // Restore just the changed fields, preserving other posts and concurrent comment/share changes.
  return () => {
    client.setQueryData<InfiniteData<FeedPageDto>>(
      feedKey,
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((card) => {
              if (card.postId !== postId) return card;
              const previous = previousFeed?.pages
                .flatMap((entry) => entry.items)
                .find((entry) => entry.postId === postId);
              if (!previous) return card;
              return {
                ...card,
                viewerState: {
                  liked: false,
                  saved: false,
                  ...card.viewerState,
                  [flag]: !!previous.viewerState?.[flag],
                },
                counts: { ...card.counts, [count]: previous.counts[count] },
              };
            }),
          })),
        },
    );
    if (previousDetail)
      client.setQueryData<PostDetail>(
        detailKey,
        (data) =>
          data && {
            ...data,
            post: { ...data.post, [detailCount]: previousDetail.post[detailCount] },
            viewerContext: {
              ...data.viewerContext,
              ...(action === 'like'
                ? { myReaction: previousDetail.viewerContext.myReaction }
                : { isBookmarked: previousDetail.viewerContext.isBookmarked }),
            },
          },
      );
  };
}
