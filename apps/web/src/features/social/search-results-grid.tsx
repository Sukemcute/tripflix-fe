'use client';

import { useEffect, useMemo, useRef } from 'react';
import { t, vi } from '@tripflix/i18n';
import { useApiSession, usePostSearchFeed } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getAvatarTone } from './avatar-tone';
import { formatAuthorDisplay, formatCompactCount, SocialIcon } from './live-posts';
import { getPostImages } from './post-cover';
import { isReelPost } from './post-type-filter';
import { formatSearchCardDate, getSearchCardCaption } from './search-result-card';
import { SEARCH_RESULT_TYPES, type SearchResultType } from './search-url';
import styles from './search-results-grid.module.css';

/** Số thẻ khung xám khi đang tải trang đầu: vừa 2 hàng trên màn rộng. */
const SKELETON_CARD_COUNT = 12;

const RESULT_TYPE_LABELS: Record<SearchResultType, string> = {
  all: vi.api.searchResultsTabAll,
  posts: vi.api.searchResultsTabPosts,
  reels: vi.api.searchResultsTabReels,
};

export interface SearchResultsGridProps {
  keyword: string;
  resultType: SearchResultType;
  onChangeResultType: (resultType: SearchResultType) => void;
  onOpenPost: (post: SocialPostDto) => void;
  /** Bấm một Reel: mở trình xem Reels, lướt trong các Reel đang có ở grid (theo thứ tự grid). */
  onOpenReel: (postId: string, reelIds: string[]) => void;
  onClearSearch: () => void;
}

/** Kết quả tìm kiếm dạng grid, chia tab Tất cả / Bài viết / Reels, xếp theo thứ tự discovery trả về. */
export function SearchResultsGrid({
  keyword,
  resultType,
  onChangeResultType,
  onOpenPost,
  onOpenReel,
  onClearSearch,
}: SearchResultsGridProps) {
  const { user } = useApiSession();
  // Reels hỏi thẳng discovery loại video. Bài viết chưa có loại khớp đúng vlog bên discovery nên dùng chung
  // kết quả Tất cả rồi lọc (cùng query với tab Bài viết khi mở bài, không gọi lại).
  const searchQuery = usePostSearchFeed(keyword, resultType === 'reels' ? 'video' : undefined);
  const { hasNextPage, isFetchingNextPage, isPending, fetchNextPage } = searchQuery;
  const scrollRef = useRef<HTMLDivElement | null>(null);
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Từ khoá hoặc tab mới thì cuộn về đầu grid.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [keyword, resultType]);

  const handleOpen = (post: SocialPostDto) => {
    if (isReelPost(post)) {
      onOpenReel(post.id, posts.filter(isReelPost).map((reel) => reel.id));
      return;
    }
    onOpenPost(post);
  };

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
    </section>
  );
}

/** Bài viết chưa có ảnh bìa từ discovery: dùng ảnh minh hoạ như thẻ ở tab Bài viết. */
function getVlogCover(post: SocialPostDto): string | undefined {
  return getPostImages({
    mediaIds: post.mediaIds,
    destinationName: post.tripAttachment?.destinationName,
    hotelName: post.tripAttachment?.hotelName,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    itineraryItems: post.tripAttachment?.items,
  })[0]?.src;
}
