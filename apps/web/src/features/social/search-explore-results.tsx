'use client';

import {
  HttpError,
  useAuthorReels,
  useAuthorVlogs,
  useExploreSearch,
  useInfiniteUserSearch,
  usePlaceSearchFeed,
  useUserSearch,
  type ExploreItemDto,
  type ExploreUnderstoodDto,
  type PlaceSearchKind,
} from '@tripflix/api-client';
import type { UserSearchItemDto } from '@tripflix/api-client/core-api/model/index';
import { getNameInitials } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { LoadingDots } from '@/features/shared/loading-dots';
import { formatPrice } from '@/features/discovery/trip-card';
import { getAvatarTone } from './avatar-tone';
import { SocialIcon, formatAuthorDisplay, formatCompactCount } from './live-posts';
import { buildAuthorExploreItems, deduplicateUsers } from './search-author-items';
import { getSectionResultType, type SearchResultType } from './search-url';
import styles from './search-results-grid.module.css';

/** Bản đồ của một điểm OSM: toạ độ đúng hơn tên (nhiều quán trùng tên). */
export function buildMapUrl(location: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}

const POST_KINDS = new Set(['plan', 'post', 'video']);
const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';
const USER_ALL_PREVIEW_LIMIT = 6;
const USER_POSTS_PREVIEW_LIMIT = 5;

interface OpenHandlers {
  onOpenPost: (postId: string) => void;
  onOpenReel: (postId: string, reelIds: string[]) => void;
}

function UserCard({ user }: { user: UserSearchItemDto }) {
  const { name, handle } = formatAuthorDisplay(user.id, user.displayName);
  return (
    <Link prefetch={false} href={`/u/${encodeURIComponent(user.id)}`} className={styles.userCard}>
      <span className={styles.userCardAvatar} data-tone={getAvatarTone(name)} aria-hidden="true">
        {getNameInitials(name) || 'TF'}
        <AvatarPhoto userId={user.id} />
      </span>
      <span className={styles.userCardBody}>
        <span className={styles.userCardName}>{name}</span>
        <span className={styles.userCardHandle}>{handle}</span>
      </span>
      <span className={styles.userCardAction}>
        <span className={styles.userCardActionLabel}>{vi.api.tripPlanViewProfile}</span>
        <SocialIcon name="chevronRight" size={14} />
      </span>
    </Link>
  );
}

/** Reels + bài viết xem trước của một tác giả; userId undefined thì chưa tải. */
function useAuthorPreviewItems(userId: string | undefined, authorName: string, excludeRefIds?: ReadonlySet<string>) {
  const authorReels = useAuthorReels(userId);
  const authorVlogs = useAuthorVlogs(userId);
  return buildAuthorExploreItems({
    reels: authorReels.data?.pages.flatMap((page) => page.items) ?? [],
    vlogs: authorVlogs.data?.pages.flatMap((page) => page.items) ?? [],
    authorName,
    excludeRefIds,
  });
}

/** Chỉ tải bài xem trước khi tác giả sắp cuộn tới: tab Người dùng không bắn 10 request ngay khi mở. */
function UserPostsPreview({ user, ...open }: OpenHandlers & { user: UserSearchItemDto }) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || isNearViewport) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setIsNearViewport(true), { rootMargin: '200px' });
    observer.observe(slot);
    return () => observer.disconnect();
  }, [isNearViewport]);
  const items = useAuthorPreviewItems(isNearViewport ? user.id : undefined, formatAuthorDisplay(user.id, user.displayName).name);
  if (!isNearViewport) return <div ref={slotRef} className={styles.userPreviewSlot} aria-hidden="true" />;
  if (items.length === 0) return null;
  return <ResultList items={items} {...open} />;
}

/** Tab Tất cả: các vùng theo thứ tự discovery xếp (vùng hợp ý câu tìm lên trước), như trang kết quả tìm bằng câu tự nhiên. */
export function ExploreAllResults({
  keyword,
  onSelectType,
  ...open
}: OpenHandlers & { keyword: string; onSelectType: (type: SearchResultType) => void }) {
  const search = useExploreSearch(keyword);
  const userSearch = useUserSearch(keyword);
  const matchedUsers = userSearch.data?.items ?? [];
  const topUser = matchedUsers[0];
  const topUserName = topUser ? formatAuthorDisplay(topUser.id, topUser.displayName).name : '';
  const result = search.data;
  const sectionRefIds = new Set(result?.sections.flatMap((section) => section.items.map((item) => item.refId)) ?? []);
  const authorItems = useAuthorPreviewItems(topUser?.id, topUserName, sectionRefIds);
  if (search.isError) {
    return (
      <div className={styles.stateBox}>
        <ApiErrorNotice error={search.error} retry={() => void search.refetch()} />
      </div>
    );
  }
  if (!result) return <p className={styles.loadingMore}><LoadingDots /></p>;
  const sections = result.sections.filter((section) => section.total > 0 && section.items.length > 0);
  const fallback = result.fallback?.items ?? [];
  const isUserSearchPending = userSearch.isSearchable && userSearch.isPending;
  const visibleFallback = sections.length === 0 && matchedUsers.length === 0 && !isUserSearchPending ? fallback : [];
  const shown = [...sections.flatMap((section) => section.items), ...visibleFallback];

  return (
    <>
      <Understood understood={result.understood} isNearUser={result.nearUser} />
      {matchedUsers.length > 0 && (
        <section className={styles.exploreSection} aria-label={vi.api.searchResultsTabUsers}>
          <header className={styles.exploreSectionHeader}>
            <h3>
              {vi.api.searchResultsTabUsers}{' '}
              <span className={styles.exploreTotal}>
                {userSearch.data?.hasMore ? `${matchedUsers.length}+` : matchedUsers.length}
              </span>
            </h3>
            <button type="button" className={styles.seeAll} onClick={() => onSelectType('users')}>
              {vi.api.searchResultsSeeAll}
            </button>
          </header>
          <ul className={styles.userGrid}>
            {matchedUsers.slice(0, USER_ALL_PREVIEW_LIMIT).map((user) => (
              <li key={user.id}>
                <UserCard user={user} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {topUser && authorItems.length > 0 && (
        <section
          className={styles.exploreSection}
          aria-label={t('api.searchResultsAuthorPosts', { name: topUserName })}
        >
          <header className={styles.exploreSectionHeader}>
            <h3>{t('api.searchResultsAuthorPosts', { name: topUserName })}</h3>
            <Link prefetch={false} href={`/u/${encodeURIComponent(topUser.id)}`} className={styles.seeAll}>
              {vi.api.tripPlanViewProfile}
            </Link>
          </header>
          <ResultList items={authorItems} {...open} />
        </section>
      )}
      {sections.map((section) => {
        const target = getSectionResultType(section.kind);
        return (
          <section key={section.kind} className={styles.exploreSection} aria-label={section.label}>
            <header className={styles.exploreSectionHeader}>
              <h3>
                {section.label} <span className={styles.exploreTotal}>{section.total}</span>
              </h3>
              {target && (
                <button type="button" className={styles.seeAll} onClick={() => onSelectType(target)}>
                  {vi.api.searchResultsSeeAll}
                </button>
              )}
            </header>
            <ResultList items={section.items} {...open} />
          </section>
        );
      })}
      {visibleFallback.length > 0 && (
        <section className={styles.exploreSection}>
          <p className={styles.fallbackNote}>{t('api.searchResultsFallback', { query: keyword })}</p>
          <ResultList items={visibleFallback} {...open} />
        </section>
      )}
      {shown.length === 0 && matchedUsers.length === 0 && !isUserSearchPending && (
        <p className={styles.stateBox}>{t('api.exploreEmpty', { query: keyword })}</p>
      )}
      <Attribution items={shown} />
    </>
  );
}

/** Tab Người dùng: danh sách người dùng khớp tên và tối đa 6 bài gần nhất của 5 người đầu. */
export function UserResults({ keyword, ...open }: OpenHandlers & { keyword: string }) {
  const search = useInfiniteUserSearch(keyword);
  if (!search.isSearchable) {
    return <p className={styles.stateBox}>{vi.api.searchResultsUsersShortQuery}</p>;
  }
  if (search.isError) {
    if (search.error instanceof HttpError && search.error.status === 429) {
      return (
        <p className={styles.stateBox} role="alert">
          {vi.api.searchResultsUsersRateLimited}
        </p>
      );
    }
    return (
      <div className={styles.stateBox}>
        <ApiErrorNotice error={search.error} retry={() => void search.refetch()} />
      </div>
    );
  }
  if (search.isPending) {
    return <p className={styles.loadingMore}><LoadingDots /></p>;
  }
  const users = deduplicateUsers(search.data?.pages.flatMap((page) => page.items) ?? []);
  if (users.length === 0) {
    return <p className={styles.stateBox}>{t('api.searchResultsUsersEmpty', { query: keyword })}</p>;
  }
  return (
    <>
      <ul className={styles.userResultList}>
        {users.map((user, index) => (
          <li key={user.id} className={styles.userResultGroup}>
            <UserCard user={user} />
            {index < USER_POSTS_PREVIEW_LIMIT && <UserPostsPreview user={user} {...open} />}
          </li>
        ))}
      </ul>
      {search.hasNextPage && (
        <button
          type="button"
          className={styles.loadMore}
          disabled={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
        >
          {search.isFetchingNextPage ? <LoadingDots label={vi.api.searchResultsLoadingMore} /> : vi.api.searchResultsLoadMore}
        </button>
      )}
    </>
  );
}

/** Tab khách sạn, địa điểm, quán ăn, quán nước: một loại, có phân trang. */
export function PlaceResults({ keyword, kind, ...open }: OpenHandlers & { keyword: string; kind: PlaceSearchKind }) {
  const search = usePlaceSearchFeed(keyword, kind);
  const pages = search.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  if (search.isError) {
    return (
      <div className={styles.stateBox}>
        <ApiErrorNotice error={search.error} retry={() => void search.refetch()} />
      </div>
    );
  }
  if (search.isPending) return <p className={styles.loadingMore}><LoadingDots /></p>;
  if (items.length === 0) return <p className={styles.stateBox}>{t('api.searchResultsEmptyKind', { query: keyword })}</p>;
  return (
    <>
      {pages[0]?.isFallback && <p className={styles.fallbackNote}>{t('api.searchResultsFallback', { query: keyword })}</p>}
      <ResultList items={items} {...open} />
      {search.hasNextPage && (
        <button
          type="button"
          className={styles.loadMore}
          disabled={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
        >
          {search.isFetchingNextPage ? <LoadingDots label={vi.api.searchResultsLoadingMore} /> : vi.api.searchResultsLoadMore}
        </button>
      )}
      <Attribution items={items} />
    </>
  );
}

function ResultList({ items, onOpenPost, onOpenReel }: OpenHandlers & { items: ExploreItemDto[] }) {
  const reelIds = items.filter((item) => item.kind === 'video').map((item) => item.refId);
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.id}>
          <ResultCard
            item={item}
            onOpen={() => (item.kind === 'video' ? onOpenReel(item.refId, reelIds) : onOpenPost(item.refId))}
          />
        </li>
      ))}
    </ul>
  );
}

/** Khách sạn mở trang khách sạn; bài, Reel mở ở trang Cảm hứng; địa điểm ngoài Tripflix mở bản đồ (không đặt được). */
function ResultCard({ item, onOpen }: { item: ExploreItemDto; onOpen: () => void }) {
  const body = <CardBody item={item} />;
  if (item.kind === 'stay') {
    return (
      <Link prefetch={false} className={styles.card} href={`/hotels/${encodeURIComponent(item.refId)}`}>
        {body}
      </Link>
    );
  }
  if (POST_KINDS.has(item.kind)) {
    return (
      <button type="button" className={styles.card} onClick={onOpen}>
        {body}
      </button>
    );
  }
  if (!item.location) return <div className={styles.card}>{body}</div>;
  return (
    <a
      className={styles.card}
      href={buildMapUrl(item.location)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('api.searchResultsOpenMap', { name: item.title })}
    >
      {body}
    </a>
  );
}

function CardBody({ item }: { item: ExploreItemDto }) {
  const isPost = POST_KINDS.has(item.kind);
  const hasImage = Boolean(item.thumbnail && /^https?:\/\//i.test(item.thumbnail));
  const price = item.priceFrom
    ? t(item.kind === 'stay' ? 'api.exploreFromPerNight' : 'api.exploreCostPerPerson', { price: formatPrice(item.priceFrom) })
    : null;
  return (
    <>
      <span className={styles.thumb} data-kind={item.kind === 'video' ? 'reel' : item.kind}>
        {hasImage ? (
          <span className={styles.thumbImage} style={{ backgroundImage: `url(${item.thumbnail})` }} />
        ) : (
          <span className={styles.thumbIcon} aria-hidden="true">
            <SocialIcon name={isPost ? 'video' : 'pin'} size={28} />
          </span>
        )}
        {item.kind === 'video' && (
          <span className={styles.reelBadge} title={vi.api.searchResultReelBadge}>
            <SocialIcon name="video" size={14} />
          </span>
        )}
        {isPost && item.likes != null && (
          <span className={styles.likes} aria-label={t('api.searchResultLikes', { count: item.likes })}>
            <SocialIcon name="heart" size={14} />
            {formatCompactCount(item.likes)}
          </span>
        )}
      </span>
      <span className={styles.caption}>{item.title}</span>
      <span className={styles.cardMeta}>
        {/* reason của discovery đã có nơi ("Ở Đà Lạt") và giá; chỉ ghép nơi, giá khi reason trống. */}
        {item.reason || [item.subtitle, price].filter(Boolean).join(' · ')}
        {item.location && item.kind !== 'stay' && <span className={styles.mapHint}> · {vi.api.searchResultsMapHint}</span>}
      </span>
    </>
  );
}

function Understood({ understood, isNearUser }: { understood: ExploreUnderstoodDto; isNearUser: boolean }) {
  const chips = [
    understood.place,
    isNearUser ? vi.api.exploreNearUser : null,
    understood.budget ? t('api.exploreBudget', { amount: formatPrice(understood.budget) }) : null,
    understood.days ? t('api.exploreDays', { days: understood.days }) : null,
    ...understood.names,
    ...Object.entries(understood.fixed).map(([from, to]) => t('api.exploreFixed', { from, to: String(to) })),
  ].filter((chip): chip is string => Boolean(chip));
  if (!chips.length) return null;
  return (
    <p className={styles.understood}>
      <span>{vi.api.exploreUnderstood}</span>
      {chips.map((chip) => (
        <span key={chip} className={styles.chip}>
          {chip}
        </span>
      ))}
    </p>
  );
}

/** Giấy phép ODbL: có điểm OpenStreetMap thì phải ghi nguồn cạnh danh sách. */
function Attribution({ items }: { items: ExploreItemDto[] }) {
  if (!items.some((item) => item.refId.startsWith('osm:'))) return null;
  return <p className={styles.attribution}>{OSM_ATTRIBUTION}</p>;
}
