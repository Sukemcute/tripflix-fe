'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, useApiSession, useAuthorVlogs, useSocialPosts } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useRouter } from 'next/navigation';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { BusyLabel, LoadingDots } from '@/features/shared/loading-dots';
import { PostCard } from './feed/post-card';
import { RightPanelCommentsSynchronized } from './live-posts';
import { ShareMenu, type ShareMenuHandle } from './share-menu';
import { buildPostHref } from './search-url';
import styles from './public-profile.module.css';

/** Dùng trang danh sách tác giả sẵn có, không gọi chi tiết riêng cho từng bài trong wall. */
export function ProfilePostWall({ userId }: { userId: string }) {
  const posts = useAuthorVlogs(userId);
  return <PostWall userId={userId} posts={posts} />;
}

export function SavedPostWall({ userId }: { userId: string }) {
  // Lọc ở API để cursor và nút tải thêm chỉ dành cho bài viết, không trộn Reels.
  const posts = useSocialPosts('bookmarks', '', 'vlog');
  return <PostWall userId={userId} posts={posts} isSavedWall />;
}

function PostWall({
  userId,
  posts,
  isSavedWall = false,
}: {
  userId: string;
  posts: {
    data?: { pages: Array<{ items: SocialPostDto[] }> };
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  isSavedWall?: boolean;
}) {
  const { user, isReady } = useApiSession();
  const router = useRouter();
  const client = useQueryClient();
  const share = useRef<ShareMenuHandle | null>(null);
  const mutationLock = useRef(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const loginHref = `/login?returnTo=${encodeURIComponent(`/u/${userId}`)}`;
  const items = posts.data?.pages.flatMap((page) => page.items) ?? [];
  const engagement = useMutation({
    mutationFn: async ({
      id,
      kind,
      selected,
    }: {
      id: string;
      kind: 'like' | 'save' | 'share';
      selected?: boolean;
    }) => {
      if (kind === 'like') return socialApi.setReaction(id, selected ? 'like' : null);
      if (kind === 'save') return socialApi.setBookmark(id, Boolean(selected));
      return socialApi.sharePost(id);
    },
    onSettled: async () => {
      try {
        await client.invalidateQueries({ queryKey: ['social'] });
      } finally {
        mutationLock.current = false;
      }
    },
  });

  function interact(id: string, kind: 'like' | 'save' | 'share', selected?: boolean) {
    if (!isReady) return;
    if (!user && kind !== 'share') {
      router.push(loginHref);
      return;
    }
    // Không gửi nhiều lần khi người dùng bấm nhanh trước khi React cập nhật isPending.
    if (mutationLock.current) return;
    mutationLock.current = true;
    engagement.mutate({ id, kind, selected });
  }

  if (posts.isPending)
    return (
      <div className={styles.empty}>
        <LoadingDots />
      </div>
    );
  if (posts.isError && !items.length)
    return <ApiErrorNotice error={posts.error} retry={() => void posts.refetch()} />;

  return (
    <div className={styles.wall}>
      <ApiErrorNotice error={engagement.error} />
      {!items.length && (
        <div className={styles.empty}>
          <h3>{isSavedWall ? vi.api.profileNoSavedPosts : vi.api.profileNoPosts}</h3>
        </div>
      )}
      {items.map((post) => (
        <div key={post.id} className={styles.wallEntry}>
          <PostCard
            post={post}
            showSuggestedImages={false}
            defaultExpanded
            currentUser={user}
            isLiked={post.viewerContext?.myReaction === 'like'}
            isSaved={isSavedWall || (post.viewerContext?.isBookmarked ?? false)}
            isCommentActive={commentPostId === post.id}
            onToggleLike={(id, selected) => interact(id, 'like', selected)}
            onToggleSave={(id, selected) => interact(id, 'save', selected)}
            onToggleComment={(id) => setCommentPostId((current) => (current === id ? null : id))}
            onShare={(_id, anchor) =>
              share.current?.toggle(anchor, { postId: post.id, postType: post.postType, title: post.title })
            }
            onViewItinerary={(id) => router.push(buildPostHref(id))}
            onOpenGallery={(id) => router.push(buildPostHref(id))}
            onOpenTag={(tag) => router.push(`/inspiration?q=${encodeURIComponent(tag)}`)}
          />
          {commentPostId === post.id && <WallComments key={post.id} post={post} loginHref={loginHref} />}
        </div>
      ))}
      <ApiErrorNotice error={posts.error} retry={() => void posts.refetch()} />
      {posts.hasNextPage && (
        <button
          type="button"
          className={`secondary-button ${styles.more}`}
          disabled={posts.isFetchingNextPage}
          onClick={() => void posts.fetchNextPage()}
        >
          <BusyLabel isBusy={posts.isFetchingNextPage}>{vi.api.profileLoadMore}</BusyLabel>
        </button>
      )}
      <ShareMenu ref={share} side="above" onShared={(id) => interact(id, 'share')} />
    </div>
  );
}

function WallComments({ post, loginHref }: { post: SocialPostDto; loginHref: string }) {
  const scroll = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className={styles.comments}>
      <RightPanelCommentsSynchronized
        post={post}
        loginHref={loginHref}
        scrollContainerRef={scroll}
        composerInputRef={input}
      />
    </div>
  );
}
