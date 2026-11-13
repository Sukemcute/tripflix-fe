import { useInfiniteQuery, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import { FeedControllerGetFeedTab } from './generated/core-api/model/feedControllerGetFeedTab';
import { readPage } from './response';
import { useApiSession } from './session';

export type ReelFeedTab = FeedControllerGetFeedTab;
export const REEL_FEED_TABS = Object.values(FeedControllerGetFeedTab);

export const feedApi = {
  async listByAuthor(authorId: string, signal?: AbortSignal) {
    return readPage((await feedControllerGetFeed({ author_id: authorId, limit: 20 }, { signal })).data);
  },
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
    // Hai tab Reels có thứ tự ngẫu nhiên theo từng lần tải: tự tải lại ngầm (mở lại app, vào lại màn) sẽ xáo
    // video ngay dưới tay người xem. Chỉ tải lại khi người xem yêu cầu, qua reloadReelsFeed.
    ...(isSavedOnly
      ? {}
      : { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false }),
  });
}

/**
 * Tải lại một tab Reels từ đầu: bỏ các trang sau trước khi tải, để chỉ đọc lại trang đầu (thứ tự mới)
 * thay vì đọc lại lần lượt mọi trang đã cuộn qua. Danh sách cũ vẫn hiện tới khi trang mới về.
 */
export async function reloadReelsFeed(queryClient: QueryClient, tab: ReelFeedTab) {
  type FeedData = InfiniteData<Awaited<ReturnType<typeof feedApi.list>>, string | undefined>;
  queryClient.setQueriesData<FeedData>({ queryKey: ['feed', tab] }, (data) =>
    data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
  );
  await queryClient.refetchQueries({ queryKey: ['feed', tab], type: 'active' });
}
