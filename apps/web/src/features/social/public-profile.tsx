'use client';

import { HttpError, useApiSession, useAuthorReels, useAuthorVlogs, useFollowAuthor, usePublicProfile } from '@tripflix/api-client';
import { formatProfileCount, getNameInitials } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { SocialIcon } from './live-posts';
import { buildInspirationHref, buildPostHref } from './search-url';
import grid from './search-results-grid.module.css';
import styles from './public-profile.module.css';

/** Trang cá nhân công khai (TF47): mở khi bấm tên hoặc avatar một người. */
export function PublicProfile({ userId }: { userId: string }) {
  const { user, isReady } = useApiSession();
  const profile = usePublicProfile(userId);
  const isMine = !!user && user.id === userId;
  const follow = useFollowAuthor(isMine ? undefined : userId);
  const [tab, setTab] = useState<'videos' | 'posts'>('videos');

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
          <p className={grid.stateBox}>{vi.api.loading}</p>
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
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {getNameInitials(displayName) || 'TF'}
        </span>
        <div className={styles.info}>
          <h1 className={styles.name}>{displayName}</h1>
          <ul className={styles.stats}>
            {stats.map((item) => (
              <li key={item.label}>
                <strong>{formatProfileCount(item.value)}</strong> {item.label}
              </li>
            ))}
          </ul>
          {isReady && !isMine && (user ? (
            <button
              type="button"
              className={follow.isFollowing ? 'secondary-button' : 'primary-button'}
              onClick={follow.toggle}
              disabled={!follow.canToggle}
            >
              {follow.isLoading || follow.isUpdating
                ? vi.api.loading
                : follow.isFollowing
                  ? vi.api.unfollowAuthor
                  : vi.api.followAuthor}
            </button>
          ) : (
            <Link className="primary-button" href={`/login?returnTo=${encodeURIComponent(`/u/${userId}`)}`}>
              {vi.api.followAuthor}
            </Link>
          ))}
          <ApiErrorNotice error={follow.error} retry={() => void follow.retry()} />
        </div>
      </header>

      <div className={grid.tabs} role="tablist">
        {(['videos', 'posts'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={grid.tab}
            onClick={() => setTab(key)}
          >
            {key === 'videos' ? vi.api.profileVideos : vi.api.profilePosts}
          </button>
        ))}
      </div>
      {tab === 'videos' ? <ReelGrid userId={userId} /> : <VlogGrid userId={userId} />}
    </main>
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

function VlogGrid({ userId }: { userId: string }) {
  const vlogs = useAuthorVlogs(userId);
  const items = vlogs.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <GridState query={vlogs} isEmpty={items.length === 0} emptyText={vi.api.profileNoPosts}>
      {items.map((post) => (
        <Tile
          key={post.id}
          href={buildPostHref(post.id)}
          image={post.images?.[0]?.url}
          likes={post.reactionTotal}
          title={post.title}
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
  query: { isPending: boolean; error: unknown; refetch: () => unknown; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (query.isPending) return <p className={grid.stateBox}>{vi.api.loading}</p>;
  if (query.error) return <ApiErrorNotice error={query.error} retry={() => void query.refetch()} />;
  if (isEmpty) return <p className={grid.stateBox}>{emptyText}</p>;
  return (
    <>
      <ul className={grid.grid}>{children}</ul>
      {query.hasNextPage && (
        <button
          type="button"
          className={`secondary-button ${styles.more}`}
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? vi.api.loading : vi.api.profileLoadMore}
        </button>
      )}
    </>
  );
}

function Tile({ href, image, isReel = false, likes, title }: {
  href: string;
  image?: string;
  isReel?: boolean;
  likes: number;
  title: string;
}) {
  return (
    <li>
      <Link prefetch={false} href={href} className={grid.card}>
        <span className={grid.thumb} data-kind={isReel ? 'reel' : 'post'}>
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
