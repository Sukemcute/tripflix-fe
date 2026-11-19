'use client';

import {
  HttpError,
  useApiSession,
  useAuthorReels,
  useFollowAuthor,
  usePublicProfile,
  useReelsFeed,
} from '@tripflix/api-client';
import { formatProfileCount, getNameInitials } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { SocialIcon, formatAuthorDisplay } from './live-posts';
import { buildInspirationHref } from './search-url';
import grid from './search-results-grid.module.css';
import styles from './public-profile.module.css';
import { LoadingDots } from '@/features/shared/loading-dots';
import { ProfilePostWall, SavedPostWall } from './profile-post-wall';

/** Trang cá nhân công khai (TF47): mở khi bấm tên hoặc avatar một người. */
export function PublicProfile({ userId }: { userId: string }) {
  const { user, isReady } = useApiSession();
  const profile = usePublicProfile(userId);
  const isMine = !!user && user.id === userId;
  const follow = useFollowAuthor(isMine ? undefined : userId);
  const [tab, setTab] = useState<'videos' | 'posts' | 'bookmarks'>('posts');
  const activeTab = tab === 'bookmarks' && !isMine ? 'posts' : tab;
  const tabs = isMine ? (['posts', 'videos', 'bookmarks'] as const) : (['posts', 'videos'] as const);

  if (profile.error instanceof HttpError && profile.error.status === 404) {
    return (
      <main className={styles.page}>
        <p className={grid.stateBox}>{vi.api.profileNotFound}</p>
      </main>
    );
  }
  if (!profile.data) {
    return (
      <main className={styles.page}>
        {profile.error ? (
          <ApiErrorNotice error={profile.error} retry={() => void profile.refetch()} />
        ) : (
          <p className={grid.stateBox}>
            <LoadingDots />
          </p>
        )}
      </main>
    );
  }
  const { displayName, followerCount, followingCount, likeCount } = profile.data;
  const stats = [
    { value: followingCount, label: vi.api.profileFollowing },
    { value: followerCount, label: vi.api.profileFollowers },
    { value: likeCount, label: vi.api.profileLikes },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.header}>
          <span className={styles.avatar} aria-hidden="true">
            {getNameInitials(displayName) || 'TF'}
            <AvatarPhoto userId={userId} />
          </span>
          <div className={styles.info}>
            <div className={styles.nameBlock}>
              <h1 className={styles.name}>{displayName}</h1>
              {/* Tên tài khoản chỉ hiện ở trang cá nhân (bài viết, Reels đã bỏ). Chưa có trường username thật nên tạo
                từ tên hiển thị như các chỗ khác (formatAuthorDisplay). */}
              <p className={styles.handle}>{formatAuthorDisplay(userId, displayName).handle}</p>
            </div>
            <ul className={styles.stats}>
              {stats.map((item) => (
                <li key={item.label}>
                  <strong>{formatProfileCount(item.value)}</strong> {item.label}
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              {isMine && (
                <Link prefetch={false} className="secondary-button" href="/account">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="m15 5 4 4M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15z" />
                  </svg>{' '}
                  {vi.api.profileEdit}
                </Link>
              )}
              {isReady &&
                !isMine &&
                (user ? (
                  <button
                    type="button"
                    className={follow.isFollowing ? 'secondary-button' : 'primary-button'}
                    onClick={follow.toggle}
                    disabled={!follow.canToggle}
                  >
                    {follow.isLoading || follow.isUpdating ? (
                      <LoadingDots />
                    ) : follow.isFollowing ? (
                      vi.api.unfollowAuthor
                    ) : (
                      vi.api.followAuthor
                    )}
                  </button>
                ) : (
                  <Link
                    className="primary-button"
                    href={`/login?returnTo=${encodeURIComponent(`/u/${userId}`)}`}
                  >
                    {vi.api.followAuthor}
                  </Link>
                ))}
            </div>
            <ApiErrorNotice error={follow.error} retry={() => void follow.retry()} />
          </div>
        </div>

        <div className={styles.tabs} role="tablist">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`profile-tab-${key}`}
              aria-controls="profile-content"
              aria-selected={activeTab === key}
              className={styles.tab}
              onClick={() => setTab(key)}
            >
              {key === 'videos'
                ? vi.api.profileVideos
                : key === 'posts'
                  ? vi.api.profilePosts
                  : vi.api.bookmarks}
            </button>
          ))}
        </div>
      </header>
      <section
        id="profile-content"
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab}`}
        className={styles.content}
      >
        {activeTab === 'videos' ? (
          <ReelGrid key={userId} userId={userId} />
        ) : activeTab === 'posts' ? (
          <ProfilePostWall key={userId} userId={userId} />
        ) : (
          <SavedProfileContent key={userId} userId={userId} />
        )}
      </section>
    </main>
  );
}

function SavedProfileContent({ userId }: { userId: string }) {
  const [kind, setKind] = useState<'posts' | 'videos'>('posts');
  return (
    <>
      <div className={styles.savedFilters} role="group" aria-label={vi.api.profileSavedKind}>
        {(['posts', 'videos'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            aria-controls="saved-profile-content"
            onClick={() => setKind(value)}
          >
            <SocialIcon name={value === 'videos' ? 'video' : 'bookmark'} size={16} />
            {value === 'posts' ? vi.api.profilePosts : vi.api.profileVideos}
          </button>
        ))}
      </div>
      <div id="saved-profile-content">
        {kind === 'posts' ? <SavedPostWall userId={userId} /> : <SavedReelGrid />}
      </div>
    </>
  );
}

function SavedReelGrid() {
  // Endpoint feed đã trả poster, lượt thích và cursor cho riêng Reels đã lưu.
  const reels = useReelsFeed({ isSavedOnly: true });
  const items = reels.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={reels} isEmpty={items.length === 0} emptyText={vi.api.profileNoSavedVideos}>
      {items.map((reel) => (
        <Tile
          key={reel.postId}
          href={buildInspirationHref('/inspiration', '', { openPostId: reel.postId, isOpenReel: true })}
          image={reel.video.posters.w360}
          isReel
          likes={reel.counts.likes}
          title={reel.title}
        />
      ))}
    </GridState>
  );
}

function ReelGrid({ userId }: { userId: string }) {
  const reels = useAuthorReels(userId);
  const items = reels.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={reels} isEmpty={items.length === 0} emptyText={vi.api.profileNoVideos}>
      {items.map((reel) => (
        <Tile
          key={reel.postId}
          href={buildInspirationHref('/inspiration', '', { openPostId: reel.postId, isOpenReel: true })}
          image={reel.video.posters.w360}
          isReel
          likes={reel.counts.likes}
          title={reel.title}
        />
      ))}
    </GridState>
  );
}

function GridState({
  query,
  isEmpty,
  emptyText,
  children,
}: {
  query: {
    isPending: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <p className={grid.stateBox}>
        <LoadingDots />
      </p>
    );
  if (query.error) return <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />;
  if (isEmpty)
    return (
      <div className={styles.empty}>
        <h3>{emptyText}</h3>
      </div>
    );
  return (
    <>
      <ul className={styles.videoGrid}>{children}</ul>
      {query.hasNextPage && (
        <button
          type="button"
          className={`secondary-button ${styles.more}`}
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? <LoadingDots /> : vi.api.profileLoadMore}
        </button>
      )}
    </>
  );
}

function Tile({
  href,
  image,
  isReel = false,
  likes,
  title,
}: {
  href: string;
  image?: string;
  isReel?: boolean;
  likes: number;
  title: string;
}) {
  return (
    <li>
      <Link prefetch={false} href={href} className={grid.card}>
        <span className={styles.videoThumb} data-kind={isReel ? 'reel' : 'post'}>
          {image && <span className={grid.thumbImage} style={{ backgroundImage: `url(${image})` }} />}
          {isReel && (
            <span className={grid.reelBadge}>
              <SocialIcon name="video" size={14} />
            </span>
          )}
          <span className={grid.likes}>
            <SocialIcon name="heart" size={14} />
            {formatProfileCount(likes)}
          </span>
        </span>
        <span className={grid.caption}>{title}</span>
      </Link>
    </li>
  );
}
