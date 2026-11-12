import { useInfiniteQuery } from '@tanstack/react-query';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import { FeedControllerGetFeedTab } from './generated/core-api/model/feedControllerGetFeedTab';
import { readPage } from './response';
import { useApiSession } from './session';

export type ReelFeedTab = FeedControllerGetFeedTab;
export const REEL_FEED_TABS = Object.values(FeedControllerGetFeedTab);

export const feedApi = {
  async list(cursor?: string, signal?: AbortSignal, tab: ReelFeedTab = 'for_you') {
    return readPage((await feedControllerGetFeed({ cursor, limit: 10, tab }, { signal })).data);
  },
};

export function useReelsFeed({
  enabled = true,
  tab = 'for_you',
}: { enabled?: boolean; tab?: ReelFeedTab } = {}) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['feed', tab, user?.id],
    enabled: isReady && enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => feedApi.list(pageParam, signal, tab),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
