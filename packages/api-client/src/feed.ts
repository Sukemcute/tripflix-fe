import { keepPreviousData, useInfiniteQuery, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { postRecommendationsControllerRecommendReels } from './generated/core-api/discovery/discovery';
import { feedControllerGetFeed } from './generated/core-api/feed/feed';
import type { FeedCardDto, PostRecommendationsControllerRecommendReelsMode, ReelRecommendationsDto } from './generated/core-api/model';
import { FeedControllerGetFeedTab } from './generated/core-api/model/feedControllerGetFeedTab';
import { useResetOnReturn } from './reset-on-return';
import { readEntity, readPage } from './response';
import { useApiSession } from './session';

export type ReelFeedTab = FeedControllerGetFeedTab;
export const REEL_FEED_TABS = Object.values(FeedControllerGetFeedTab);
/** Tiền tố key của Reels gợi ý (useRecommendedReelsFeed): ['feed', 'recommended', mode, userId]. */
export const RECOMMENDED_REELS_KEY = ['feed', 'recommended'] as const;

/** BE nhận tối đa 20 id mỗi lần gọi /v1/feed?post_ids=. */
export const REELS_BY_IDS_PAGE_SIZE = 20;

/** Cắt danh sách id thành từng lượt gọi; `nextOffset` null là đã hết. */
export function sliceReelIdsPage(postIds: readonly string[], offset: number) {
  const ids = postIds.slice(offset, offset + REELS_BY_IDS_PAGE_SIZE);
  const nextOffset = offset + REELS_BY_IDS_PAGE_SIZE < postIds.length ? offset + REELS_BY_IDS_PAGE_SIZE : null;
  return { ids, nextOffset };
}

export const feedApi = {
  /** Thẻ Reels của đúng các bài này, theo thứ tự truyền vào; bài không xem được thì BE bỏ qua. */
  async listByIds(postIds: readonly string[], signal?: AbortSignal) {
    return readPage((await feedControllerGetFeed({ post_ids: postIds.join(',') }, { signal })).data);
  },
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
 * Reels mở từ kết quả tìm kiếm: lướt trong đúng các bài đã cho, mỗi trang tối đa 20 id.
 * Cùng dạng infinite query với useReelsFeed để trình xem Reels dùng chung.
 */
export function useReelsByIds(postIds: readonly string[], { enabled = true }: { enabled?: boolean } = {}) {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['feed', 'byIds', postIds.join(','), user?.id],
    enabled: isReady && enabled && postIds.length > 0,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const { ids, nextOffset } = sliceReelIdsPage(postIds, pageParam);
      const page = await feedApi.listByIds(ids, signal);
      return { ...page, nextOffset };
    },
    getNextPageParam: (page) => page.nextOffset ?? undefined,
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

/**
 * Tải lại Reels gợi ý của một mode từ đầu, như reloadReelsFeed: chỉ gọi lại trang đầu.
 * Trang đầu không có cursor nên discovery mở phiên mới và đẩy bài đã gợi ý ở phiên trước xuống.
 */
/** Mode vừa được người xem tự tải lại: lần gọi trang đầu kế tiếp gửi fresh=true để discovery mở phiên mới. */
const freshRecommendedModes = new Set<PostRecommendationsControllerRecommendReelsMode>();

/** Trang đầu có cần gửi fresh không; đọc xong thì xoá, để lần tải sau quay về phiên bình thường. */
export function takeRecommendedFresh(mode: PostRecommendationsControllerRecommendReelsMode) {
  return freshRecommendedModes.delete(mode);
}

export async function reloadRecommendedReels(queryClient: QueryClient, mode: PostRecommendationsControllerRecommendReelsMode) {
  freshRecommendedModes.add(mode);
  type RecommendedData = InfiniteData<{ items: FeedCardDto[]; nextCursor: string | null | undefined }, string | undefined>;
  const queryKey = [...RECOMMENDED_REELS_KEY, mode];
  queryClient.setQueriesData<RecommendedData>({ queryKey }, (data) =>
    data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
  );
  await queryClient.refetchQueries({ queryKey, type: 'active' });
}

/**
 * Reels gợi ý từ discovery (`GET /api/recommendations/reels`): hỗ trợ 4 mode `trending | for_you | has_plan | recent`.
 * Key nằm dưới tiền tố `feed` (RECOMMENDED_REELS_KEY) để cập nhật tim, lưu, số bình luận của Reels tự áp dụng cho danh sách này.
 */
export function useRecommendedReelsFeed({
  enabled = true,
  mode = 'trending',
  refreshOnReturn = false,
}: {
  enabled?: boolean;
  mode?: PostRecommendationsControllerRecommendReelsMode;
  /** Quay lại trang thì bỏ danh sách cũ, gọi lại gợi ý (useResetOnReturn). */
  refreshOnReturn?: boolean;
} = {}) {
  const { user, isReady } = useApiSession();
  const queryKey = [...RECOMMENDED_REELS_KEY, mode, user?.id];
  useResetOnReturn(queryKey, refreshOnReturn && isReady && enabled);
  return useInfiniteQuery({
    queryKey,
    enabled: isReady && enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const response = await postRecommendationsControllerRecommendReels(
        { mode, limit: 10, ...(pageParam ? { cursor: pageParam } : takeRecommendedFresh(mode) ? { fresh: 'true' as const } : {}) },
        { signal },
      );
      const page = readEntity(response.data, ['items', 'algo', 'nextCursor']) as ReelRecommendationsDto;
      return {
        items: page.items.map((item) => item.card as unknown as FeedCardDto),
        nextCursor: page.nextCursor,
      };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Đổi kiểu gợi ý: giữ danh sách cũ trong lúc tải danh sách mới (isPlaceholderData) để khung Reels không bị thay bằng dấu chờ rồi nhảy.
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
