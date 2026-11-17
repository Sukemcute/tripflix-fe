'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { t, vi } from '@tripflix/i18n';
import { useApiSession, usePostSearchFeed } from '@tripflix/api-client';
import type { SearchPostsRequestDtoSort, SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getAvatarTone } from './avatar-tone';
import { formatAuthorDisplay, formatCompactCount, SocialIcon } from './live-posts';
import { getPostImages } from './post-cover';
import { isReelPost } from './post-type-filter';
import { formatSearchCardDate, getSearchCardCaption } from './search-result-card';
import { ExploreAllResults, PlaceResults } from './search-explore-results';
import { getPlaceKind, SEARCH_RESULT_TYPES, type SearchResultType } from './search-url';
import styles from './search-results-grid.module.css';

/** Số thẻ khung xám khi đang tải trang đầu: vừa 2 hàng trên màn rộng. */
const SKELETON_CARD_COUNT = 12;

const RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  all: vi.api.searchResultsTabAll,
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
  onOpenPost,
  onOpenReel,
  onClearSearch,
}: SearchResultsGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const placeKind = getPlaceKind(resultType);
  const [sort, setSort] = useState<SearchPostsRequestDtoSort>('relevance');

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

      <div className={styles.tabs} role="tablist" aria-label={vi.api.searchResultsTabsAria}>
        {SEARCH_RESULT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={type === resultType}
            className={styles.tab}
            onClick={() => onChangeResultType(type)}
          >
            {RESULT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {resultType === 'all' ? (
        <ExploreAllResults keyword={keyword} onSelectType={onChangeResultType} onOpenPost={onOpenPost} onOpenReel={onOpenReel} />
      ) : placeKind ? (
        <PlaceResults keyword={keyword} kind={placeKind} onOpenPost={onOpenPost} onOpenReel={onOpenReel} />
      ) : (
        <>
          <div className={styles.tabs} role="tablist" aria-label={vi.api.postSortAria}>
            {POST_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={option.value === sort}
                className={styles.tab}
                onClick={() => setSort(option.value)}
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

/** Tab Bài viết, Reels: bài đầy đủ theo thứ tự discovery, cuộn vô hạn. */
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const posts = useMemo(() => {
    const items = searchQuery.data?.pages.flatMap((page) => page.items) ?? [];
    if (resultType === 'posts') return items.filter((post) => post.postType === 'vlog');
    if (resultType === 'reels') return items.filter(isReelPost);
    return items;
  }, [searchQuery.data, resultType]);
  // Lọc xong mà trống trong khi còn trang sau (vd. trang đầu toàn Reels ở tab Bài viết): tải tiếp thay vì báo rỗng.
  const isFilling = posts.length === 0 && Boolean(hasNextPage);
  useEffect(() => {
    if (isFilling && !isPending && !isFetchingNextPage) void fetchNextPage();
  }, [isFilling, isPending, isFetchingNextPage, fetchNextPage]);
  const thumbnails = useMemo(
    () => Object.assign({}, ...(searchQuery.data?.pages.map((page) => page.thumbnails) ?? [])) as Record<string, string | null>,
    [searchQuery.data],
  );

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

  const handleOpen = (post: SocialPostDto) => {
    if (isReelPost(post)) {
      onOpenReel(post.id, posts.filter(isReelPost).map((reel) => reel.id));
      return;
    }
    onOpenPost(post.id);
  };

  return (
    <>
      {searchQuery.isError ? (
        <div className={styles.stateBox}>
          <ApiErrorNotice error={searchQuery.error} retry={() => void searchQuery.refetch()} />
        </div>
      ) : isPending || isFilling ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <div key={index} className={styles.skeletonCard} aria-hidden="true">
              <div className={styles.skeletonThumb} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className={styles.stateBox}>{t('api.noPostsForKeyword', { query: keyword })}</p>
      ) : (
        <ul className={styles.grid}>
          {posts.map((post) => {
            const isReel = isReelPost(post);
            const caption = getSearchCardCaption(post);
            const author = formatAuthorDisplay(post.authorId, post.authorName, user?.id, user?.displayName);
            const cover = thumbnails[post.id] ?? (isReel ? undefined : getVlogCover(post));
            const dateText = formatSearchCardDate(post.publishedAt ?? post.createdAt);
            return (
              <li key={post.id}>
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => handleOpen(post)}
                >
                  <span className={styles.thumb} data-kind={isReel ? 'reel' : 'post'}>
                    {cover && <span className={styles.thumbImage} style={{ backgroundImage: `url(${cover})` }} />}
                    {isReel && (
                      <span className={styles.reelBadge} title={vi.api.searchResultReelBadge}>
                        <SocialIcon name="video" size={14} />
                      </span>
                    )}
                    <span
                      className={styles.likes}
                      aria-label={t('api.searchResultLikes', { count: post.reactionTotal })}
                    >
                      <SocialIcon name="heart" size={14} />
                      {formatCompactCount(post.reactionTotal)}
                    </span>
                  </span>
                  <span className={styles.caption}>
                    {caption.text}
                    {caption.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {' '}#{tag}
                      </span>
                    ))}
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.avatar} data-tone={getAvatarTone(author.name)} aria-hidden="true">
                      {author.name.charAt(0).toUpperCase()}
                    </span>
                    <span className={styles.authorName}>{author.name}</span>
                    {dateText && <span className={styles.date}>{dateText}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      {isFetchingNextPage && <p className={styles.loadingMore}>{vi.api.searchResultsLoadingMore}</p>}
    </>
  );
}

/** Bài viết chưa có ảnh bìa từ discovery: ảnh đầu tiên tác giả tải lên, không có thì ảnh minh hoạ như tab Bài viết. */
function getVlogCover(post: SocialPostDto): string | undefined {
  return getPostImages({
    uploadedImageUrls: post.images?.map((image) => image.url),
    mediaIds: post.mediaIds,
    destinationName: post.tripAttachment?.destinationName,
    hotelName: post.tripAttachment?.hotelName,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    itineraryItems: post.tripAttachment?.items,
  })[0]?.src;
}
