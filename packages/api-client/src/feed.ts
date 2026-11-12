import { useInfiniteQuery } from '@tanstack/react-query';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import { FeedControllerGetFeedTab } from './generated/core-api/model/feedControllerGetFeedTab';
import { readPage } from './response';
import { useApiSession } from './session';

export type ReelFeedTab = FeedControllerGetFeedTab;
export const REEL_FEED_TABS = Object.values(FeedControllerGetFeedTab);

export const feedApi = {
  async list(
    cursor?: string,
    signal?: AbortSignal,
    tab: ReelFeedTab = 'for_you',
    { isSavedOnly = false }: { isSavedOnly?: boolean } = {},
  ) {
    // BE chỉ nhận saved cùng tab for_you (đi với hot thì trả 400).
    const query = isSavedOnly ? { cursor, limit: 10, tab: 'for_you' as const, saved: 'true' as const } : { cursor, limit: 10, tab };
    return readPage((await feedControllerGetFeed(query, { signal })).data);
  },
};

export function useReelsFeed({
  enabled = true,
  tab = 'for_you',
  isSavedOnly = false,
}: { enabled?: boolean; tab?: ReelFeedTab; isSavedOnly?: boolean } = {}) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: isSavedOnly ? ['feed', 'saved', user?.id] : ['feed', tab, user?.id],
    // Reels đã lưu cần đăng nhập; khách gọi sẽ nhận 401.
    enabled: isReady && enabled && (!isSavedOnly || Boolean(user)),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => feedApi.list(pageParam, signal, tab, { isSavedOnly }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
