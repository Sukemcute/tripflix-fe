'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { t, vi } from '@tripflix/i18n';
import { useApiSession, useAuthorReels, useAuthorVlogs, usePostSearchFeed, useUserSearch } from '@tripflix/api-client';
import type { SearchPostsRequestDtoSort } from '@tripflix/api-client/core-api/model/index';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { getAvatarTone } from './avatar-tone';
import { formatAuthorDisplay, formatCompactCount, SocialIcon } from './live-posts';
import { mergeSearchGridCards, type GridCardItem } from './search-author-items';
import { ExploreAllResults, PlaceResults, UserResults } from './search-explore-results';
import { getPlaceKind, SEARCH_RESULT_TYPES, type SearchResultType } from './search-url';
import segmentedTabs from '../shared/segmented-tabs.module.css';
import styles from './search-results-grid.module.css';
import { LoadingDots } from '@/features/shared/loading-dots';

/** Số thẻ khung xám khi đang tải trang đầu: vừa 2 hàng trên màn rộng. */
const SKELETON_CARD_COUNT = 12;

const RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  all: vi.api.searchResultsTabAll,
  users: vi.api.searchResultsTabUsers,
  hotels: vi.api.searchResultsTabHotels,
  places: vi.api.searchResultsTabPlaces,
  food: vi.api.searchResultsTabFood,
  cafe: vi.api.searchResultsTabCafe,
  posts: vi.api.searchResultsTabPosts,
  reels: vi.api.searchResultsTabReels,
};

const POST_SORT_OPTIONS: Array<{ value: SearchPostsRequestDtoSort; label: string }> = [
  { value: 'relevance', label: vi.api.postSortRelevance },
  { value: 'trending', label: vi.api.postSortTrending },
  { value: 'recent', label: vi.api.postSortRecent },
];

export interface SearchResultsGridProps {
  keyword: string;
  resultType: SearchResultType;
  onChangeResultType: (resultType: SearchResultType) => void;
  /** Kiểu sắp xếp bài, Reels: trang Cảm hứng giữ (URL) để bài mở từ grid cuộn đúng thứ tự này. */
  sort: SearchPostsRequestDtoSort;
  onChangeSort: (sort: SearchPostsRequestDtoSort) => void;
  /** Mở bài ở trang Cảm hứng theo id. */
  onOpenPost: (postId: string) => void;
  /** Bấm một Reel: mở trình xem Reels, lướt trong các Reel đang có ở grid (theo thứ tự grid). */
  onOpenReel: (postId: string, reelIds: string[]) => void;
  onClearSearch: () => void;
}

/**
 * Kết quả tìm kiếm dạng grid, chia tab Tất cả / Khách sạn / Địa điểm / Quán ăn / Quán nước / Bài viết / Reels,
 * xếp theo thứ tự discovery trả về. Tất cả chia theo vùng (POST /api/search); tab chỗ, điểm gọi POST /api/search/places.
 */
export function SearchResultsGrid({
  keyword,
  resultType,
  onChangeResultType,
  sort,
  onChangeSort,
  onOpenPost,
  onOpenReel,
  onClearSearch,
}: SearchResultsGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const placeKind = getPlaceKind(resultType);

  // Từ khoá hoặc tab mới thì cuộn về đầu grid.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [keyword, resultType, sort]);

  return (
    <section ref={scrollRef} className={styles.resultsScroll} aria-label={vi.api.searchResultsAria}>
      <header className={styles.resultsHeader}>
        <h2 className={styles.resultsTitle}>{t('api.searchResultsTitle', { query: keyword })}</h2>
        <button type="button" className={styles.clearButton} onClick={onClearSearch}>
          <SocialIcon name="close" size={13} />
          {vi.api.feedSearchClear}
        </button>
      </header>

      <div className={`${segmentedTabs.tabs} ${segmentedTabs.tabsAuto} ${styles.tabs}`} role="tablist" aria-label={vi.api.searchResultsTabsAria}>
        {SEARCH_RESULT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={type === resultType}
            className={segmentedTabs.tab}
            onClick={() => onChangeResultType(type)}
          >
            {RESULT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {resultType === 'all' ? (
        <ExploreAllResults keyword={keyword} onSelectType={onChangeResultType} onOpenPost={onOpenPost} onOpenReel={onOpenReel} />
      ) : resultType === 'users' ? (
        <UserResults keyword={keyword} onOpenPost={onOpenPost} onOpenReel={onOpenReel} />
      ) : placeKind ? (
        <PlaceResults keyword={keyword} kind={placeKind} onOpenPost={onOpenPost} onOpenReel={onOpenReel} />
      ) : (
        <>
          <div className={`${segmentedTabs.tabs} ${segmentedTabs.tabsAuto} ${styles.tabs}`} role="tablist" aria-label={vi.api.postSortAria}>
            {POST_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={option.value === sort}
                className={`${segmentedTabs.tab} ${segmentedTabs.tabCompact}`}
                onClick={() => onChangeSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <PostResults
            keyword={keyword}
            resultType={resultType}
            sort={sort}
            scrollRef={scrollRef}
            onOpenPost={onOpenPost}
            onOpenReel={onOpenReel}
          />
        </>
      )}
    </section>
  );
}

/** Tab Bài viết, Reels: bài đầy đủ theo thứ tự discovery + bài của tác giả khớp tên, cuộn vô hạn. */
function PostResults({
  keyword,
  resultType,
  sort,
  scrollRef,
  onOpenPost,
  onOpenReel,
}: Pick<SearchResultsGridProps, 'keyword' | 'resultType' | 'onOpenPost' | 'onOpenReel'> & {
  sort: SearchPostsRequestDtoSort;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const { user } = useApiSession();
  // Reels hỏi thẳng discovery loại video. Bài viết chưa có loại khớp đúng vlog bên discovery nên dùng chung
  // kết quả Tất cả rồi lọc (cùng query với tab Bài viết khi mở bài, không gọi lại).
  const searchQuery = usePostSearchFeed(keyword, resultType === 'reels' ? 'video' : undefined, sort);
  const { hasNextPage, isFetchingNextPage, isPending, fetchNextPage } = searchQuery;
  const userSearch = useUserSearch(keyword);
  const topUser = userSearch.data?.items?.[0];
  const authorVlogs = useAuthorVlogs(resultType === 'posts' ? topUser?.id : undefined);
  const authorReels = useAuthorReels(resultType === 'reels' ? topUser?.id : undefined);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const thumbnails = useMemo(
    () => Object.assign({}, ...(searchQuery.data?.pages.map((page) => page.thumbnails) ?? [])) as Record<string, string | null>,
    [searchQuery.data],
  );

  const cards = useMemo<GridCardItem[]>(
    () =>
      mergeSearchGridCards({
        resultType,
        discoveryItems: searchQuery.data?.pages.flatMap((page) => page.items) ?? [],
        thumbnails,
        userVlogs: authorVlogs.data?.pages.flatMap((page) => page.items) ?? [],
        userReels: authorReels.data?.pages.flatMap((page) => page.items) ?? [],
        authorName: topUser?.displayName,
      }),
    [searchQuery.data, thumbnails, resultType, authorVlogs.data, authorReels.data, topUser?.displayName],
  );

  const isAuthorQueryPending =
    (userSearch.isSearchable && userSearch.isPending) ||
    (Boolean(topUser) && (resultType === 'posts' ? authorVlogs.isPending : authorReels.isPending));
  // Lọc xong mà trống trong khi còn trang sau (vd. trang đầu toàn Reels ở tab Bài viết): tải tiếp thay vì báo rỗng.
  const isFilling = cards.length === 0 && Boolean(hasNextPage);
  const showSkeleton = isPending || isFilling || (cards.length === 0 && isAuthorQueryPending);
  useEffect(() => {
    if (isFilling && !isPending && !isFetchingNextPage) void fetchNextPage();
  }, [isFilling, isPending, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { root: scrollRef.current, rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, scrollRef]);

  const allReelIds = useMemo(() => cards.filter((card) => card.isReel).map((card) => card.id), [cards]);

  const handleOpen = (card: GridCardItem) => {
    if (card.isReel) {
      onOpenReel(card.id, allReelIds);
      return;
    }
    onOpenPost(card.id);
  };

  return (
    <>
      {searchQuery.isError ? (
        <div className={styles.stateBox}>
          <ApiErrorNotice error={searchQuery.error} retry={() => void searchQuery.refetch()} />
        </div>
      ) : showSkeleton ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <div key={index} className={styles.skeletonCard} aria-hidden="true">
              <div className={styles.skeletonThumb} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className={styles.stateBox}>{t('api.noPostsForKeyword', { query: keyword })}</p>
      ) : (
        <ul className={styles.grid}>
          {cards.map((card) => {
            const author = formatAuthorDisplay(card.authorId, card.authorName, user?.id, user?.displayName);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => handleOpen(card)}
                >
                  <span className={styles.thumb} data-kind={card.isReel ? 'reel' : 'post'}>
                    {card.cover && <span className={styles.thumbImage} style={{ backgroundImage: `url(${card.cover})` }} />}
                    {card.isReel && (
                      <span className={styles.reelBadge} title={vi.api.searchResultReelBadge}>
                        <SocialIcon name="video" size={14} />
                      </span>
                    )}
                    <span
                      className={styles.likes}
                      aria-label={t('api.searchResultLikes', { count: card.likes })}
                    >
                      <SocialIcon name="heart" size={14} />
                      {formatCompactCount(card.likes)}
                    </span>
                  </span>
                  <span className={styles.caption}>
                    {card.captionText}
                    {card.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {' '}#{tag}
                      </span>
                    ))}
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.avatar} data-tone={getAvatarTone(author.name)} aria-hidden="true">
                      {author.name.charAt(0).toUpperCase()}
                      <AvatarPhoto userId={card.authorId} />
                    </span>
                    <span className={styles.authorName}>{author.name}</span>
                    {card.dateText && <span className={styles.date}>{card.dateText}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      {isFetchingNextPage && <p className={styles.loadingMore}><LoadingDots label={vi.api.searchResultsLoadingMore} /></p>}
    </>
  );
}
