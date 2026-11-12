'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  evictPostFromCache,
  HttpError,
  isPostNotFoundError,
  removeReelFromSavedFeedCache,
  socialApi,
  updateReelSocialCache,
  uploadChunkToPresignedUrl,
  useApiSession,
  useReelsFeed,
  useSocialPosts,
} from '@tripflix/api-client';
import {
  mediaUploadControllerCreateUpload,
  mediaUploadControllerCompleteUpload,
} from '@tripflix/api-client/core-api/media/media';
import type {
  FeedCardDto,
  SocialPostDto,
  TripAttachmentDto,
  TripItineraryItemDto,
  UpdatePostDto,
} from '@tripflix/api-client/core-api/model/index';
import { commentsControllerSetCommentReaction } from '@tripflix/api-client/core-api/social-comments/social-comments';
import { getReelPosterPrefetchUrls, selectReelPoster } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getInitial } from '@/features/auth/account-helpers';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getPostCover, getPostImages, POST_COVER_MASCOT } from './post-cover';
import { getAvatarTone } from './avatar-tone';
import { EmojiPicker } from './emoji-picker';
import { insertAtSelection } from './emoji-picker-data';
import { useHasUserInteracted } from './use-has-user-interacted';
import { useSettledFlag } from './use-settled-flag';
import {
  getReelRenderMode,
  pickReelAfterRemoval,
  shouldShowReelBackdrop,
  toReelPost,
  type ReelPost,
} from './reel-post';
import { ItinerarySidebarPanel } from './feed/itinerary-sidebar-panel';
import { ReelCommentSummary } from './post-summary';
import { CommentSkeletonList } from './comment-skeleton';
import styles from './live-posts.module.css';

// Trang chi tiết bài viết nằm ở post-detail.tsx; giữ export ở đây để app/trips/[slug]/page.tsx không phải đổi.
export { LivePostDetail } from './post-detail';

type FeedFilterMode = 'all' | 'withTrip' | 'saved';

export type SocialIconName =
  | 'search'
  | 'sparkles'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'verified'
  | 'pin'
  | 'more'
  | 'heart'
  | 'heartFilled'
  | 'comment'
  | 'share'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowUpRight'
  | 'trendingUp'
  | 'chevronDown'
  | 'calendar'
  | 'clock'
  | 'wallet'
  | 'chevronRight'
  | 'chevronLeft'
  | 'info'
  | 'close'
  | 'send'
  | 'play'
  | 'pause'
  | 'volumeOn'
  | 'volumeOff'
  | 'maximize'
  | 'minimize'
  | 'users'
  | 'compass'
  | 'filter'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'upload'
  | 'trash'
  | 'video'
  | 'smile';

/** Bộ icon vector đồng nhất nét 1.85px theo chuẩn Instagram / Threads / Lucide. */
export function SocialIcon({ name, size = 18 }: { name: SocialIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3c.6 3.7 2.3 5.4 6 6-3.7.6-5.4 2.3-6 6-.6-3.7-2.3-5.4-6-6 3.7-.6 5.4-2.3 6-6Z" />
          <path d="M19 15c.3 1.6 1 2.3 2.6 2.6-1.6.3-2.3 1-2.6 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.3 2.3-1 2.6-2.6Z" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" />
        </svg>
      );
    case 'bookmarkFilled':
      return (
        <svg {...common} fill="currentColor">
          <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" />
        </svg>
      );
    case 'verified':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path
            d="M20 1.5 22.36 4.95 25.72 2.4 26.91 6.44 30.87 5.03 30.75 9.25 35.97 9.13 33.56 13.09 37.6 14.28 35.05 17.64 38.5 20 35.05 22.36 37.6 25.72 33.56 26.91 34.97 30.87 30.75 30.75 30.87 34.97 26.91 33.56 25.72 37.6 22.36 35.05 20 38.5 17.64 35.05 14.28 37.6 13.09 33.56 9.13 34.97 9.25 30.75 5.03 30.87 6.44 26.91 2.4 25.72 4.95 22.36 1.5 20 4.95 17.64 2.4 14.28 6.44 13.09 5.03 9.13 9.25 9.25 9.13 5.03 13.09 6.44 14.28 2.4 17.64 4.95Z"
            fill="#2D9BEF"
            stroke="#2D9BEF"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M13.2 20.4 17.8 25 27.2 15.6"
            stroke="#FFFFFF"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case 'more':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5.5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="18.5" cy="12" r="1.75" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 20.3s-7.5-4.6-9.1-9C1.8 8 3.8 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.6 1.2-1.5 2.7-2.6 4.7-2.6 3.5 0 5.5 3.5 4.4 6.8-1.6 4.4-9.1 9-9.1 9Z" />
        </svg>
      );
    case 'heartFilled':
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 20.3s-7.5-4.6-9.1-9C1.8 8 3.8 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.6 1.2-1.5 2.7-2.6 4.7-2.6 3.5 0 5.5 3.5 4.4 6.8-1.6 4.4-9.1 9-9.1 9Z" />
        </svg>
      );
    case 'comment':
      return (
        <svg {...common}>
          <path d="M20.5 11.8a8.4 8.4 0 0 1-12.5 7.3L3.5 20.5l1.5-4.3A8.4 8.4 0 1 1 20.5 11.8Z" />
        </svg>
      );
    case 'share':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 4.2a1 1 0 0 1 1.7-.7l6.5 6.5a1.4 1.4 0 0 1 0 2l-6.5 6.5a1 1 0 0 1-1.7-.7v-3.5c-4.6 0-7.9 1.5-10.2 4.8-.5.7-1.6.2-1.4-.7 1.3-6.6 5.4-10.3 11.6-10.7V4.2Z" />
        </svg>
      );
    case 'arrowUp':
      return (
        <svg {...common}>
          <path d="m18 15-6-6-6 6" />
        </svg>
      );
    case 'arrowDown':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'arrowUpRight':
      return (
        <svg {...common}>
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
      );
    case 'trendingUp':
      return (
        <svg {...common}>
          <path d="m22 7-8.5 8.5-5-5L2 17" />
          <path d="M16 7h6v6" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M16 12.5h.01" />
          <path d="M3 10h18" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case 'chevronLeft':
      return (
        <svg {...common}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <circle cx="12" cy="8" r="0.6" fill="currentColor" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case 'smile':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8" />
          <path d="M9 9.5h.01" />
          <path d="M15 9.5h.01" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <path d="m21 3-9.5 9.5" />
          <path d="m21 3-6.5 18-3-8.5L3 9.5 21 3Z" />
        </svg>
      );
    case 'play':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      );
    case 'pause':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6.5" y="5" width="4" height="14" rx="1" />
          <rect x="13.5" y="5" width="4" height="14" rx="1" />
        </svg>
      );
    case 'volumeOn':
      return (
        <svg {...common}>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      );
    case 'volumeOff':
      return (
        <svg {...common}>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="m21 9-6 6M15 9l6 6" />
        </svg>
      );
    case 'maximize':
      return (
        <svg {...common}>
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="15" height="16" rx="2" />
          <path d="m17 9 5-3v12l-5-3" />
        </svg>
      );
    case 'minimize':
      return (
        <svg {...common}>
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );
  }
}

export function formatAuthorDisplay(
  authorId: string,
  feedAuthorName?: string | null,
  currentUserId?: string,
  currentDisplayName?: string | null,
) {
  if (currentUserId && authorId === currentUserId) {
    const name = currentDisplayName?.trim() || vi.api.postYou;
    const handle = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
    return { name, handle: `@${handle || 'me'}` };
  }
  if (feedAuthorName?.trim()) {
    const clean = feedAuthorName.trim();
    const handle = clean
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
    return { name: clean, handle: `@${handle}` };
  }
  const shortId = authorId.slice(0, 6).toLowerCase();
  return {
    name: `${vi.api.commentMember} ${shortId}`,
    handle: `@user_${shortId}`,
  };
}

export function formatDateVi(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

export function formatCompactCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(value);
}

export function PublicPosts({
  kind = 'public',
  keyword = '',
}: {
  kind?: 'public' | 'mine' | 'bookmarks';
  /** Chỉ với bài công khai: tìm theo tiêu đề và nội dung (GET /v1/posts?keyword=). */
  keyword?: string;
}) {
  if (kind !== 'public') {
    return <AccountPostGrid kind={kind} keyword={keyword} />;
  }
  return <InspirationImmersiveViewer />;
}

/** Giữ nguyên hiển thị dạng lưới cho trang Tài khoản (/account: bài của tôi & bài đã lưu). */
function AccountPostGrid({
  kind,
  keyword = '',
}: {
  kind: 'mine' | 'bookmarks';
  keyword?: string;
}) {
  const { isReady, user } = useApiSession();
  const query = useSocialPosts(kind, keyword);
  const posts = query.data?.pages.flatMap((page) => page.items);
  if (!isReady) return <output>{vi.api.loading}</output>;
  if (!user) return <Link prefetch={false} href="/login">{vi.api.loginRequired}</Link>;
  return (
    <>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {posts?.length === 0 && (
        <p className="empty-state">
          {kind === 'bookmarks'
            ? vi.api.noBookmarks
            : keyword
              ? t('api.noPostsForKeyword', { query: keyword })
              : vi.api.noPosts}
        </p>
      )}
      <div className="trip-grid">
        {posts?.map((post) => {
          const cover = getPostCover(post.tripAttachment?.destinationName, post.title, post.hashtags);
          return (
            <article key={post.id} className="trip-card">
              <div className="trip-card-body">
                {cover && (
                  <div className={styles.cover}>
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                    />
                  </div>
                )}
                <p className="eyebrow">{post.tripAttachment?.destinationName ?? vi.api.posts}</p>
                <h3>
                  <Link prefetch={false} href={`/trips/${post.id}`}>{post.title}</Link>
                </h3>
                <p className={styles.postBodyClamped}>{post.body}</p>
                <p className="small muted">
                  {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments}
                </p>
                <Link prefetch={false} href={`/trips/${post.id}`} className="secondary-button">
                  {vi.api.detail}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {query.hasNextPage && (
        <button
          type="button"
          className="secondary-button"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
    </>
  );
}

/**
 * TRIPFLIX — INSPIRATION IMMERSIVE 3-PANEL VIEWER
 * - Left Panel: Attached Itinerary (Tự động thu gọn khi bài không có lịch trình đính kèm)
 * - Center Panel: Immersive Media Viewer (Video HLS/MP4, Ảnh, hoặc Text-only post + Vertical Action Bar + Post Navigation)
 * - Right Panel: Post Details & Comments (Đồng bộ theo activePostId, bình luận cha–con + Sticky Comment Composer)
 * - Mặc định Light Mode + nút chuyển đổi Light / Dark Mode.
 */
interface MediaTrackItemProps {
  itemRef?: (el: HTMLDivElement | null) => void;
  /** Cột Thích/Bình luận/Lưu/Chia sẻ của riêng Reel này, cuộn cùng video như TikTok. */
  actions?: React.ReactNode;
  index: number;
  post: ReelPost;
  isActive: boolean;
  /** Có thẻ <video> (bài đang xem và bài kế tiếp); bài khác chỉ hiện poster để không tải segment. */
  hasVideo: boolean;
  /** Có lớp nền mờ (tốn GPU) – chỉ bài đang xem và hai bài sát cạnh. */
  hasBackdrop: boolean;
  reelCard?: FeedCardDto;
  user: { id: string; displayName: string } | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isPlaying: boolean;
  showPlayFlash: boolean;
  mediaErrorPostId: string | null;
  onMediaError: (postId: string) => void;
  onTogglePlay: () => void;
  captionExpandedPostId: string | null;
  onToggleCaption: (postId: string) => void;
  onOpenTag: (tag: string) => void;
  onOpenItinerary: (postId: string) => void;
}

/**
 * Tung phan tu noi dung media ben trong Media Track.
 * Chi co Media Track truot doc ben trong khung 9:16 co dinh (chuan TikTok).
 */
const NO_REEL_POSTERS = { w360: '', w540: '', w720: '' };

interface ReelEngagement {
  isLiked: boolean;
  isSaved: boolean;
  likes: number;
  saves: number;
  comments: number;
  shares: number;
}

interface ReelActionRailProps {
  engagement: ReelEngagement;
  isSignedIn: boolean;
  loginHref: string;
  isCommentOpen: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  onToggleComments: () => void;
}

function ReelActionRail({
  engagement,
  isSignedIn,
  loginHref,
  isCommentOpen,
  onToggleLike,
  onToggleSave,
  onShare,
  onToggleComments,
}: ReelActionRailProps) {
  const { isLiked, isSaved } = engagement;
  return (
    <div className={styles.stageSideDock}>
      <div className={styles.verticalActionsCluster}>
        {isSignedIn ? (
          <button
            type="button"
            className={`${styles.verticalActionItem} ${isLiked ? styles.verticalActionLiked : ''}`}
            aria-pressed={isLiked}
            aria-label={vi.api.like}
            onClick={onToggleLike}
          >
            <span className={styles.verticalActionCircle}>
              <SocialIcon name={isLiked ? 'heartFilled' : 'heart'} size={26} />
            </span>
            <span className={styles.verticalActionCount}>{formatCompactCount(engagement.likes)}</span>
          </button>
        ) : (
          <Link prefetch={false} href={loginHref} className={styles.verticalActionItem} aria-label={vi.api.like}>
            <span className={styles.verticalActionCircle}>
              <SocialIcon name="heart" size={26} />
            </span>
            <span className={styles.verticalActionCount}>{formatCompactCount(engagement.likes)}</span>
          </Link>
        )}

        <button
          type="button"
          className={`${styles.verticalActionItem} ${isCommentOpen ? styles.verticalActionActive : ''}`}
          aria-expanded={isCommentOpen}
          aria-label={t('api.commentsWithCount', { count: engagement.comments })}
          onClick={onToggleComments}
        >
          <span className={styles.verticalActionCircle}>
            <SocialIcon name="comment" size={26} />
          </span>
          <span className={styles.verticalActionCount}>{formatCompactCount(engagement.comments)}</span>
        </button>

        {isSignedIn ? (
          <button
            type="button"
            className={`${styles.verticalActionItem} ${isSaved ? styles.verticalActionSaved : ''}`}
            aria-pressed={isSaved}
            aria-label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
            onClick={onToggleSave}
          >
            <span className={styles.verticalActionCircle}>
              <SocialIcon name={isSaved ? 'bookmarkFilled' : 'bookmark'} size={26} />
            </span>
            <span className={styles.verticalActionCount}>{formatCompactCount(engagement.saves)}</span>
          </button>
        ) : (
          <Link prefetch={false} href={loginHref} className={styles.verticalActionItem} aria-label={vi.api.bookmark}>
            <span className={styles.verticalActionCircle}>
              <SocialIcon name="bookmark" size={26} />
            </span>
            <span className={styles.verticalActionCount}>{formatCompactCount(engagement.saves)}</span>
          </Link>
        )}

        <button type="button" className={styles.verticalActionItem} aria-label={vi.api.share} onClick={onShare}>
          <span className={styles.verticalActionCircle}>
            <SocialIcon name="share" size={26} />
          </span>
          <span className={styles.verticalActionCount}>{formatCompactCount(engagement.shares)}</span>
        </button>
      </div>
    </div>
  );
}

function MediaTrackItem({
  itemRef,
  actions,
  index,
  post,
  isActive,
  hasVideo,
  hasBackdrop,
  reelCard,
  user,
  videoRef,
  isMuted,
  isPlaying,
  showPlayFlash,
  mediaErrorPostId,
  onMediaError,
  onTogglePlay,
  captionExpandedPostId,
  onToggleCaption,
  onOpenTag,
  onOpenItinerary,
}: MediaTrackItemProps) {
  const trip = post.tripAttachment ?? null;
  const hasItinerary = Boolean(
    trip &&
      (trip.destinationName ||
        trip.hotelName ||
        trip.daysCount ||
        trip.estimatedCostPerPerson ||
        (trip.items && trip.items.length > 0)),
  );

  const postImages = useMemo(
    () =>
      getPostImages({
        mediaIds: post.mediaIds,
        posterUrl: reelCard ? selectReelPoster(reelCard.video.posters, 720) : undefined,
        destinationName: trip?.destinationName,
        hotelName: trip?.hotelName,
        title: post.title,
        body: post.body,
        hashtags: post.hashtags,
        itineraryItems: trip?.items,
      }),
    [post, reelCard, trip],
  );

  const coverImage = postImages[0]?.src;
  // Giống Reels mobile: khi chưa tới lượt phát chỉ hiện poster thật của video, không dùng ảnh minh hoạ
  // theo điểm đến (trông như ảnh bài viết rồi mới "biến" thành video khi lướt nhanh bằng touchpad).
  const reelPoster = reelCard ? selectReelPoster(reelCard.video.posters, 720) : undefined;
  const isMediaError = mediaErrorPostId === post.id;
  const isCaptionExpanded = captionExpandedPostId === post.id;
  const authorInfo = formatAuthorDisplay(
    post.authorId,
    post.authorName ?? reelCard?.author.name,
    user?.id,
    user?.displayName,
  );

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive && localVideoRef.current) {
      localVideoRef.current.pause();
    }
  }, [isActive]);

  // Khi thẻ video bị gỡ (lướt ra xa) chỉ pause() hoặc gỡ khỏi DOM thì trình duyệt vẫn có thể tải tiếp
  // segment, giữ bộ đệm và bộ giải mã tới lúc dọn rác. Xoá src rồi load() để ngắt tải và trả tài nguyên ngay.
  useEffect(() => {
    const video = localVideoRef.current;
    if (!hasVideo || !video) return;
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [hasVideo, reelCard?.video.hlsUrl]);

  // timeupdate chỉ bắn ~4 lần/giây nên thanh tiến độ nhảy bậc; đọc currentTime mỗi khung hình và
  // cập nhật thẳng transform qua ref (không setState) để mượt và không render lại cả viewer.
  useEffect(() => {
    if (!isActive) return;
    const frame = { id: 0 };
    const tick = () => {
      const video = localVideoRef.current;
      const fill = progressFillRef.current;
      if (video && fill && video.duration > 0) {
        fill.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
      }
      frame.id = window.requestAnimationFrame(tick);
    };
    frame.id = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.id);
  }, [isActive]);

  return (
    <div
      ref={itemRef}
      className={styles.mediaItem}
      data-index={index}
      data-post-id={post.id}
      aria-hidden={!isActive}
    >
      {hasBackdrop && reelCard && (
        <div
          className={styles.mediaBackdropBlur}
          // Ảnh đằng nào cũng bị làm mờ nên dùng poster nhỏ nhất: giải mã nhanh, tốn ít bộ nhớ hơn.
          style={{ backgroundImage: `url(${selectReelPoster(reelCard.video.posters, 360)})` }}
        />
      )}

      {/* Media Content: Reels luôn là video; chưa có link phát hoặc phát lỗi thì hiện khung chờ như Reels mobile */}
      {!reelCard?.video || isMediaError ? (
        <output className={styles.reelPendingStage}>
          {isMediaError ? (
            <span className={styles.reelPendingText}>{vi.api.immersiveMediaError}</span>
          ) : (
            <span className={styles.reelPendingSpinner} aria-label={vi.api.loading} />
          )}
        </output>
      ) : (
        <>
          {hasVideo ? (
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (videoRef) {
                  if (isActive) {
                    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                  } else if (videoRef.current === el) {
                    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = null;
                  }
                }
              }}
              className={`${styles.mediaVideoElement} ${
                reelCard.video.aspect === '16:9' ? styles.mediaVideoLandscape : ''
              }`}
              src={reelCard.video.hlsUrl}
              poster={selectReelPoster(reelCard.video.posters, 720)}
              preload="auto"
              playsInline
              loop
              muted={isMuted}
              onError={() => onMediaError(post.id)}
              onClick={isActive ? onTogglePlay : undefined}
            >
              <track kind="captions" />
            </video>
          ) : (
            <Image
              src={reelPoster ?? POST_COVER_MASCOT}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className={styles.mediaImageElement}
              unoptimized={Boolean(reelPoster?.startsWith('http'))}
            />
          )}

          {isActive && (
            <>
              <button
                type="button"
                className={`${styles.centerPlayOverlayBtn} ${
                  !showPlayFlash ? styles.centerPlayOverlayHidden : ''
                }`}
                aria-label={isPlaying ? vi.api.immersivePauseVideo : vi.api.immersivePlayVideo}
                tabIndex={-1}
                onClick={onTogglePlay}
              >
                <SocialIcon name={isPlaying ? 'play' : 'pause'} size={26} />
              </button>
              <div className={styles.progressBarTrack} aria-hidden="true">
                <div ref={progressFillRef} className={styles.progressBarFill} />
              </div>
            </>
          )}
        </>
      )}

      {/* Bottom Post Overlay */}
      <div className={styles.stageBottomOverlay}>
        <div className={styles.overlayAuthorRow}>
          <span className={styles.overlayAvatar} aria-hidden="true">
            {getInitial(authorInfo.name)}
          </span>
          <div className={styles.overlayAuthorMeta}>
            <div className={styles.overlayAuthorNameRow}>
              <span>{authorInfo.name}</span>
              {(post.isVerified || reelCard?.author.isKol) && (
                <SocialIcon name="verified" size={16} />
              )}
            </div>
            <span className={styles.overlayAuthorHandle}>{authorInfo.handle}</span>
          </div>
        </div>

        {Boolean(postImages.length > 0 || reelCard?.video) && (
          <div className={styles.overlayCaptionBox}>
            <p
              className={`${styles.overlayCaptionText} ${
                !isCaptionExpanded ? styles.overlayCaptionClamped : ''
              }`}
            >
              <strong>{post.title}</strong> — {post.body}
            </p>
            {post.body.length > 80 && (
              <button
                type="button"
                className={styles.overlayExpandBtn}
                onClick={() => onToggleCaption(post.id)}
              >
                {isCaptionExpanded ? vi.api.postShowLess : vi.api.postReadMore}
              </button>
            )}
          </div>
        )}

        {post.hashtags.length > 0 && (
          <div className={styles.overlayTagRow}>
            {post.hashtags.slice(0, 4).map((tag) => (
              <button
                key={tag}
                type="button"
                className={styles.overlayTagPill}
                onClick={() => onOpenTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {hasItinerary && trip && (
          <button
            type="button"
            className={styles.overlayAttachedTripCard}
            onClick={() => onOpenItinerary(post.id)}
          >
            <div className={styles.overlayTripLeft}>
              <span className={styles.overlayTripThumb}>
                <Image
                  src={coverImage ?? POST_COVER_MASCOT}
                  alt=""
                  fill
                  sizes="44px"
                  unoptimized={Boolean(coverImage?.startsWith('http'))}
                />
              </span>
              <div className={styles.overlayTripText}>
                <span className={styles.overlayTripTitle}>
                  {trip.hotelName ?? trip.destinationName ?? post.title}
                </span>
                <span className={styles.overlayTripSub}>
                  {[
                    vi.api.immersiveTabSchedule,
                    trip.items?.length
                      ? t('api.immersiveStopsCount', { count: trip.items.length })
                      : trip.daysCount
                        ? t('api.postTripDaysBadge', { count: trip.daysCount })
                        : null,
                    trip.estimatedCostPerPerson
                      ? `~${trip.estimatedCostPerPerson.toLocaleString('vi-VN')}d/nguoi`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
            <SocialIcon name="chevronRight" size={18} />
          </button>
        )}
      </div>

      {actions}
    </div>
  );
}

/**
 * Phan biet con lan chuot vat ly (Mouse Wheel) va ban di cam ung (Touchpad).
 * - Mouse Wheel: deltaMode !== 0, hoac deltaY co gia tri lon roi rac (>= 50, boi so 100/120), deltaX = 0, khong phai dong su kien lien tuc.
 * - Touchpad: deltaMode === 0, dong su kien lien tuc tan so cao voi gia tri ban dau nho (< 40) hoac so thap phan.
 */
function isPhysicalMouseWheel(event: WheelEvent): boolean {
  if (event.deltaMode !== 0) return true;

  const absY = Math.abs(event.deltaY);
  const absX = Math.abs(event.deltaX);

  if (absX === 0 && (absY % 100 === 0 || absY % 120 === 0) && absY >= 100) {
    return true;
  }

  return false;
}



export interface InspirationImmersiveViewerProps {
  /** Bấm hashtag trên Reel: chốt tìm kiếm theo tag (hiện grid kết quả). */
  onSearchKeywordChange?: (keyword: string) => void;
  isItineraryOpen?: boolean;
  onToggleItinerary?: () => void;
  onOpenComposer?: (type?: 'video' | 'vlog') => void;
}

export function InspirationImmersiveViewer({
  onSearchKeywordChange,
  isItineraryOpen: propIsItineraryOpen,
  onToggleItinerary,
  onOpenComposer,
}: InspirationImmersiveViewerProps) {
  const { isReady, user } = useApiSession();
  const client = useQueryClient();

  const [filterMode] = useState<FeedFilterMode>('all');
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const [internalIsLeftOpen, setInternalIsLeftOpen] = useState(true);
  const isLeftOpen = propIsItineraryOpen !== undefined ? propIsItineraryOpen : internalIsLeftOpen;
  const setLeftOpen = useCallback(
    (open: boolean) => {
      if (onToggleItinerary) {
        if ((open && !isLeftOpen) || (!open && isLeftOpen)) {
          onToggleItinerary();
        }
      } else {
        setInternalIsLeftOpen(open);
      }
    },
    [onToggleItinerary, isLeftOpen]
  );
  const [isRightOpen, setRightOpen] = useState(true);
  const [isComposerModalOpen, setComposerModalOpen] = useState(false);

  // Media player session states
  const [isMuted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setPlaying] = useState(true);
  const centerPanelRef = useRef<HTMLElement | null>(null);
  const trackScrollRef = useRef<HTMLDivElement | null>(null);
  const mediaItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activePostIdRef = useRef<string | null>(activePostId);
  const lastCommittedPostIdRef = useRef<string | null>(activePostId);
  const targetIndexRef = useRef<number>(0);
  const isProgrammaticNavRef = useRef<boolean>(false);
  const navCooldownRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollEndSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    activePostIdRef.current = activePostId;
  }, [activePostId]);
  const [showPlayFlash, setShowPlayFlash] = useState(false);
  const [mediaErrorPostId, setMediaErrorPostId] = useState<string | null>(null);
  const [captionExpandedPostId, setCaptionExpandedPostId] = useState<string | null>(null);

  // Optimistic states per postId
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  const [optimisticSaves, setOptimisticSaves] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);

  const isSavedMode = filterMode === 'saved';
  // Tìm kiếm không chạy ở đây: nhấn Enter thì trang Cảm hứng hiện grid kết quả (search của discovery).
  const reelsQuery = useReelsFeed({ enabled: isReady, isSavedOnly: isSavedMode });
  const postsQuery = reelsQuery;

  const reelMap = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof reelsQuery.data>['pages'][number]['items'][number]
    >();
    for (const page of reelsQuery.data?.pages ?? []) {
      for (const item of page.items) {
        map.set(item.postId, item);
      }
    }
    return map;
  }, [reelsQuery.data]);

  // Reels chỉ gồm bài dạng video; bài viết (vlog) không bao giờ hiện ở đây.
  const rawPosts = useMemo<ReelPost[]>(
    () => (reelsQuery.data?.pages.flatMap((page) => page.items) ?? []).map(toReelPost),
    [reelsQuery.data],
  );

  const posts = useMemo(() => {
    if (filterMode !== 'withTrip') return rawPosts;
    return rawPosts.filter((post) => {
      const trip = post.tripAttachment;
      return Boolean(
        trip &&
          (trip.destinationName ||
            trip.hotelName ||
            trip.daysCount ||
            trip.estimatedCostPerPerson ||
            (trip.items && trip.items.length > 0)),
      );
    });
  }, [rawPosts, filterMode]);

  const activeIndex = useMemo(() => {
    if (posts.length === 0) return -1;
    const found = posts.findIndex((item) => item.id === activePostId);
    return found >= 0 ? found : 0;
  }, [posts, activePostId]);

  // Giống Reels mobile: tải trước poster của 3 Reel kế tiếp để lướt tới là có hình ngay.
  useEffect(() => {
    if (activeIndex < 0) return;
    // Giữ đúng vị trí trong posts; bài chưa có thẻ feed dùng bộ poster rỗng, helper tự bỏ URL rỗng.
    const posterSets = posts.map((item) => reelMap.get(item.id)?.video.posters ?? NO_REEL_POSTERS);
    for (const url of getReelPosterPrefetchUrls(posterSets, activeIndex, 720)) {
      const preload = new window.Image();
      preload.src = url;
    }
  }, [posts, reelMap, activeIndex]);

  const activePost = activeIndex >= 0 ? posts[activeIndex] ?? null : null;
  const isMediaError = Boolean(activePost && mediaErrorPostId === activePost.id);

  const trip = activePost?.tripAttachment ?? null;
  const reelCard = activePost ? reelMap.get(activePost.id) : undefined;
  const postImages = activePost
    ? getPostImages({
        mediaIds: activePost.mediaIds,
        posterUrl: reelCard ? selectReelPoster(reelCard.video.posters, 720) : undefined,
        destinationName: trip?.destinationName,
        hotelName: trip?.hotelName,
        title: activePost.title,
        body: activePost.body,
        hashtags: activePost.hashtags,
        itineraryItems: trip?.items,
      })
    : [];
  const coverImage = postImages[0]?.src;

  // Lấy viewerContext thực tế của bài đang active (myReaction, isBookmarked)
  const postDetailQuery = useQuery({
    queryKey: ['social', 'post', activePost?.id, user?.id],
    enabled: isReady && Boolean(activePost?.id),
    queryFn: ({ signal }) => socialApi.getPost(activePost!.id, signal),
  });

  const isPostNotFound = Boolean(activePost && isPostNotFoundError(postDetailQuery.error));

  // Tự động dọn cache khi bài viết nhận lỗi 404 (đã bị xoá hoặc tạm ẩn do kiểm duyệt)
  useEffect(() => {
    if (activePost && isPostNotFoundError(postDetailQuery.error)) {
      evictPostFromCache(client, activePost.id);
    }
  }, [activePost, postDetailQuery.error, client]);

  // Tự động tải trang tiếp theo khi lướt gần cuối, hoặc khi các trang đã tải chưa có Reels nào sau khi lọc.
  useEffect(() => {
    if (
      (posts.length === 0 || activeIndex >= posts.length - 2) &&
      postsQuery.hasNextPage &&
      !postsQuery.isFetchingNextPage
    ) {
      void postsQuery.fetchNextPage();
    }
  }, [activeIndex, posts.length, postsQuery]);

  // Hàm phát video tự động an toàn (xử lý autoplay policy của browser)
  const attemptPlayVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setPlaying(true);
        })
        .catch(() => {
          // Nếu browser chặn unmuted autoplay, thử lại với muted = true
          el.muted = true;
          setMuted(true);
          void el.play()
            .then(() => {
              setPlaying(true);
            })
            .catch(() => {
              setPlaying(false);
            });
        });
    }
  }, [isMuted]);

  // Khi chuyển bài (activePost?.id thay đổi):
  // 1. Reset scroll của danh sách bình luận về đầu
  // 2. Kích hoạt tự động phát video nếu bài viết mới có video
  useEffect(() => {
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTop = 0;
    }

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime = 0;
      attemptPlayVideo();
    }
  }, [activePost?.id, attemptPlayVideo]);



  const togglePlayPause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
    setShowPlayFlash(true);
    if (playFlashTimerRef.current) {
      clearTimeout(playFlashTimerRef.current);
    }
    playFlashTimerRef.current = setTimeout(() => {
      setShowPlayFlash(false);
    }, 700);
  }, []);

  // Chi cap nhat activePostId (va counter 3/10, count like/comment/save/share, comments panel)
  // khi thao tac luot hoac chuyen bai da hoan tat 100% va dung yen (settled).
  // TUYET DOI KHONG goi scrollTo hay can thiep vao vi tri de CSS Scroll Snap native tu xu ly muot ma.
  const commitSettledPost = useCallback(
    (targetIdx?: number) => {
      const container = trackScrollRef.current;
      if (!container || posts.length === 0) return;

      let settledIndex: number;
      if (typeof targetIdx === 'number') {
        settledIndex = Math.max(0, Math.min(posts.length - 1, targetIdx));
      } else {
        const itemHeight = container.clientHeight;
        if (itemHeight <= 0) return;
        const fractionalIndex = container.scrollTop / itemHeight;
        settledIndex = Math.max(0, Math.min(posts.length - 1, Math.round(fractionalIndex)));
      }

      const settledPost = posts[settledIndex];
      if (settledPost && settledPost.id !== activePostIdRef.current) {
        lastCommittedPostIdRef.current = settledPost.id;
        activePostIdRef.current = settledPost.id;
        targetIndexRef.current = settledIndex;
        setActivePostId(settledPost.id);
      }
      isProgrammaticNavRef.current = false;
    },
    [posts],
  );

  // Di chuyen den bai viet muc tieu bang animation cuon tu dinh (CSS Scroll Snap).
  // Trong suot qua trinh dang cuon, KHONG cap nhat activePostId de giu nguyen UI cu cho den khi chuyen xong hoan toan.
  const goToIndex = useCallback(
    (nextIdx: number, smooth = true) => {
      if (posts.length === 0) return;
      const clamped = Math.max(0, Math.min(posts.length - 1, nextIdx));
      const container = trackScrollRef.current;
      if (!container) return;

      targetIndexRef.current = clamped;

      const targetEl = mediaItemRefs.current[clamped];

      if (!smooth) {
        isProgrammaticNavRef.current = false;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else {
          container.scrollTo({ top: clamped * container.clientHeight, behavior: 'auto' });
        }
        commitSettledPost(clamped);
      } else {
        isProgrammaticNavRef.current = true;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          container.scrollTo({
            top: clamped * container.clientHeight,
            behavior: 'smooth',
          });
        }

        if (scrollEndSafetyTimerRef.current) {
          clearTimeout(scrollEndSafetyTimerRef.current);
        }
        // Bo dem an toan neu scrollend khong duoc trigger
        scrollEndSafetyTimerRef.current = setTimeout(() => {
          commitSettledPost(clamped);
        }, 460);
      }

      if (clamped >= posts.length - 2 && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
        void postsQuery.fetchNextPage();
      }
    },
    [posts, postsQuery, commitSettledPost],
  );

  // Dieu huong buoc (Step Navigation): dung chung logic luot tu dinh va bo dem debounce 450ms
  // cho ca Con lan chuot, Phim mui ten ban phim, Nut mui ten tren man hinh, va Vuot touchpad ngoai khung
  const navigateStep = useCallback(
    (direction: 1 | -1) => {
      const now = Date.now();
      if (now < navCooldownRef.current) return;

      const currentBase = targetIndexRef.current;
      const nextTarget = currentBase + direction;

      if (direction === 1) {
        if (nextTarget < posts.length) {
          navCooldownRef.current = now + 450;
          goToIndex(nextTarget, true);
        } else if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
          navCooldownRef.current = now + 450;
          void postsQuery.fetchNextPage();
        }
      } else {
        if (nextTarget >= 0) {
          navCooldownRef.current = now + 450;
          goToIndex(nextTarget, true);
        }
      }
    },
    [posts.length, postsQuery, goToIndex],
  );

  // Dong bo targetIndexRef theo activeIndex khi da settled hoac chon bai tu ngoai
  useEffect(() => {
    if (activeIndex >= 0) {
      targetIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  // Dong bo vi tri cuon chi khi activePostId thay doi tu nguon ben ngoai (Search, filter, click bai viet)
  useEffect(() => {
    if (!activePostId || posts.length === 0) return;
    if (activePostId === lastCommittedPostIdRef.current) return;

    lastCommittedPostIdRef.current = activePostId;
    const targetIdx = posts.findIndex((p) => p.id === activePostId);
    if (targetIdx >= 0 && trackScrollRef.current) {
      const container = trackScrollRef.current;
      const targetEl = mediaItemRefs.current[targetIdx];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        container.scrollTo({ top: targetIdx * container.clientHeight, behavior: 'auto' });
      }
    }
  }, [activePostId, posts]);

  // Lang nghe su kien scrollend native tren media track: chi commit khi scroll hoan tat hoan toan
  useEffect(() => {
    const container = trackScrollRef.current;
    if (!container) return;

    const onScrollEnd = () => {
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
      }
      if (scrollEndSafetyTimerRef.current) {
        clearTimeout(scrollEndSafetyTimerRef.current);
      }

      if (isProgrammaticNavRef.current) {
        commitSettledPost(targetIndexRef.current);
      } else {
        commitSettledPost();
      }
    };

    container.addEventListener('scrollend', onScrollEnd);
    return () => {
      container.removeEventListener('scrollend', onScrollEnd);
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
      }
      if (scrollEndSafetyTimerRef.current) {
        clearTimeout(scrollEndSafetyTimerRef.current);
      }
    };
  }, [commitSettledPost]);

  // Tu dong tai them bai viet khi cuon gan cuoi danh sach kem debounce commit khi cuon touchpad dung lai
  const handleTrackScroll = useCallback(() => {
    const container = trackScrollRef.current;
    if (!container) return;

    const scrollBottom = container.scrollTop + container.clientHeight;
    if (
      container.scrollHeight - scrollBottom < container.clientHeight * 2 &&
      postsQuery.hasNextPage &&
      !postsQuery.isFetchingNextPage
    ) {
      void postsQuery.fetchNextPage();
    }

    // Neu dang trong qua trinh dieu huong co chu dich (bam nut, ban phim, con lan chuot),
    // KHONG chay debounce tu do de tranh ghi de hoac tinh sai vi tri giua chung
    if (isProgrammaticNavRef.current) return;

    if (scrollSettleTimerRef.current) {
      clearTimeout(scrollSettleTimerRef.current);
    }
    // Voi thao tac vuot tu do touchpad trong khung, doi 250ms sau su kien scroll cuoi cung
    // de chac chan ngon tay da roi ra va trinh duyet da snap xong
    scrollSettleTimerRef.current = setTimeout(() => {
      commitSettledPost();
    }, 250);
  }, [postsQuery, commitSettledPost]);

  // Xu ly cuon tren center panel: dung chung animation luot tu dinh (CSS Scroll Snap)
  useEffect(() => {
    const panel = centerPanelRef.current;
    if (!panel) return;

    function handlePanelWheel(event: WheelEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(`.${styles.leftScrollBody}`) ||
        target?.closest(`.${styles.rightScrollArea}`)
      ) {
        return;
      }

      const now = Date.now();
      const isInsideTrack = Boolean(trackScrollRef.current?.contains(target));
      const isMouse = isPhysicalMouseWheel(event);
      lastWheelTimeRef.current = now;

      // 1. Con lan chuot vat ly: lan 1 nac se luot tu dinh qua 1 bai (ca trong va ngoai khung)
      if (isMouse) {
        event.preventDefault();
        event.stopPropagation();
        navigateStep(event.deltaY > 0 ? 1 : -1);
        return;
      }

      // 2. Touchpad khi con tro nam ngoai khung (khoang den cua center panel, dock, nav buttons):
      // Ap dung y chang animation luot tu dinh bang cach goi navigateStep voi nguong deltaY
      if (!isInsideTrack) {
        event.preventDefault();
        if (Math.abs(event.deltaY) >= 15) {
          navigateStep(event.deltaY > 0 ? 1 : -1);
        }
      }
      // 3. Touchpad khi con tro nam trong khung: De trinh duyet cuon tu do va tu dinh (native scroll snap)
      if (isInsideTrack) {
        isProgrammaticNavRef.current = false;
      }
    }

    panel.addEventListener('wheel', handlePanelWheel, { passive: false });
    return () => {
      panel.removeEventListener('wheel', handlePanelWheel);
    };
  }, [navigateStep]);

  // Hỗ trợ phím ArrowUp / ArrowDown để chuyển bài, và ArrowLeft / ArrowRight / Escape khi mở Image Gallery
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigateStep(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigateStep(-1);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateStep]);

  // Optimistic mutation cho Like / Save / Share với rollback khi lỗi
  const engagementMutation = useMutation({
    mutationFn: async (payload: {
      postId: string;
      type: 'like' | 'save' | 'share';
      nextSelected?: boolean;
    }) => {
      if (payload.type === 'like') {
        return socialApi.setReaction(payload.postId, payload.nextSelected ? 'like' : null);
      }
      if (payload.type === 'save') {
        return socialApi.setBookmark(payload.postId, Boolean(payload.nextSelected));
      }
      const shareUrl =
        (postDetailQuery.data?.post.id === payload.postId
          ? postDetailQuery.data?.shareUrl
          : undefined) || `${window.location.origin}/trips/${payload.postId}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: activePost?.title,
            url: shareUrl,
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
        }
      } catch {
        // Bỏ qua nếu người dùng đóng hộp thoại chia sẻ hoặc trình duyệt chặn clipboard
      }
      return socialApi.sharePost(payload.postId);
    },
    onMutate: async (payload) => {
      if (payload.type === 'like' && payload.nextSelected !== undefined) {
        const previous = optimisticLikes[payload.postId];
        setOptimisticLikes((prev) => ({ ...prev, [payload.postId]: payload.nextSelected! }));
        const rollbackCache = user
          ? updateReelSocialCache(client, user.id, payload.postId, 'like', payload.nextSelected)
          : undefined;
        return { previous, rollbackCache };
      }
      if (payload.type === 'save' && payload.nextSelected !== undefined) {
        const previous = optimisticSaves[payload.postId];
        setOptimisticSaves((prev) => ({ ...prev, [payload.postId]: payload.nextSelected! }));
        const rollbackCache = user
          ? updateReelSocialCache(client, user.id, payload.postId, 'save', payload.nextSelected)
          : undefined;
        return { previous, rollbackCache };
      }
      return {};
    },
    onError: (_, payload, context) => {
      context?.rollbackCache?.();
      if (payload.type === 'like') {
        setOptimisticLikes((prev) => {
          const next = { ...prev };
          if (context?.previous === undefined) delete next[payload.postId];
          else next[payload.postId] = context.previous;
          return next;
        });
      }
      if (payload.type === 'save') {
        setOptimisticSaves((prev) => {
          const next = { ...prev };
          if (context?.previous === undefined) delete next[payload.postId];
          else next[payload.postId] = context.previous;
          return next;
        });
      }
    },
    onSuccess: (_, payload) => {
      // Bỏ lưu xong thì Reel không còn thuộc "Đã lưu".
      if (payload.type === 'save' && payload.nextSelected === false && user) {
        if (isSavedMode && payload.postId === activePost?.id) {
          // Bài kế tiếp trượt lên đúng chỗ đang xem; đánh dấu đã commit để không cuộn lại.
          const nextPostId = pickReelAfterRemoval(
            posts.map((item) => item.id),
            payload.postId,
          );
          lastCommittedPostIdRef.current = nextPostId;
          activePostIdRef.current = nextPostId;
          setActivePostId(nextPostId);
        }
        removeReelFromSavedFeedCache(client, user.id, payload.postId);
      }
    },
    onSettled: async (_, __, payload) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
      ]);
      setOptimisticLikes((prev) => {
        const next = { ...prev };
        delete next[payload.postId];
        return next;
      });
      setOptimisticSaves((prev) => {
        const next = { ...prev };
        delete next[payload.postId];
        return next;
      });
    },
  });

  const hasItinerary = Boolean(
    trip &&
      (trip.destinationName ||
        trip.hotelName ||
        trip.daysCount ||
        trip.estimatedCostPerPerson ||
        (trip.items && trip.items.length > 0)),
  );
  // Sidebar Lịch trình đi theo lựa chọn đóng/mở của người dùng, không theo từng bài: bài không có lịch trình
  // thì hiện trạng thái trống, để khung video không tự co giãn mỗi khi lướt qua bài thiếu lịch trình.
  const showLeftPanel = Boolean(activePost) && isLeftOpen;
  const showRightPanel = Boolean(activePost) && isRightOpen;

  // Chưa thao tác thì đổi bố cục ngay (biết màn rộng, tải xong bài), chỉ chạy hiệu ứng khi người dùng bấm đóng/mở.
  const hasUserInteracted = useHasUserInteracted();
  // Reels mount mới mỗi lần chuyển tab: panel bình luận hiện khi bài tải xong cũng là bố cục ban đầu.
  const isLayoutSettled = useSettledFlag(Boolean(activePost));
  const isLayoutAnimated = hasUserInteracted && isLayoutSettled;
  const gridLayoutClass =
    showLeftPanel && showRightPanel
      ? styles.gridThreeCols
      : !showLeftPanel && showRightPanel
        ? styles.gridNoLeft
        : showLeftPanel && !showRightPanel
          ? styles.gridNoRight
          : styles.gridCenterOnly;

  const activePostDetail =
    postDetailQuery.data?.post.id === activePost?.id ? postDetailQuery.data : undefined;

  /** Trạng thái và số đếm tương tác của một Reel: bài đang xem theo chi tiết mới nhất, bài khác theo thẻ feed. */
  function getReelEngagement(post: ReelPost): ReelEngagement {
    const detail = activePostDetail?.post.id === post.id ? activePostDetail : undefined;
    const card = reelMap.get(post.id);
    const serverLiked = detail
      ? detail.viewerContext.myReaction !== null
      : Boolean(card?.viewerState?.liked);
    const serverSaved = detail
      ? detail.viewerContext.isBookmarked
      : filterMode === 'saved' || Boolean(card?.viewerState?.saved);
    const isLiked = optimisticLikes[post.id] ?? serverLiked;
    const isSaved = optimisticSaves[post.id] ?? serverSaved;
    return {
      isLiked,
      isSaved,
      likes: Math.max(
        0,
        (detail?.post.reactionTotal ?? post.reactionTotal) + Number(isLiked) - Number(serverLiked),
      ),
      saves: Math.max(
        0,
        (detail?.post.bookmarkCount ?? post.bookmarkCount) + Number(isSaved) - Number(serverSaved),
      ),
      comments: detail?.post.commentCount ?? post.commentCount,
      shares: detail?.post.shareCount ?? post.shareCount,
    };
  }

  const displayComments = activePost ? getReelEngagement(activePost).comments : 0;




  const loginReturnHref = '/login?returnTo=%2Finspiration';

  function handleCommentButtonClick() {
    if (!isRightOpen) {
      setRightOpen(true);
      setTimeout(() => commentInputRef.current?.focus(), 120);
      return;
    }
    setRightOpen(false);
  }

  function renderReelActions(post: ReelPost, isActiveItem: boolean) {
    const engagement = getReelEngagement(post);
    return (
      <ReelActionRail
        engagement={engagement}
        isSignedIn={Boolean(user)}
        loginHref={loginReturnHref}
        isCommentOpen={isRightOpen && isActiveItem}
        onToggleLike={() =>
          engagementMutation.mutate({ postId: post.id, type: 'like', nextSelected: !engagement.isLiked })
        }
        onToggleSave={() =>
          engagementMutation.mutate({ postId: post.id, type: 'save', nextSelected: !engagement.isSaved })
        }
        onShare={() => engagementMutation.mutate({ postId: post.id, type: 'share' })}
        onToggleComments={() => {
          if (!isActiveItem) setActivePostId(post.id);
          handleCommentButtonClick();
        }}
      />
    );
  }

  // Đảm bảo loại bỏ thuộc tính data-theme còn sót lại, giữ mặc định Light Mode
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.removeItem('tripflix.theme');
      localStorage.removeItem('tripflix.inspiration.theme');
    } catch {
      // Bỏ qua lỗi truy cập Storage
    }
  }, []);

  if (!isReady) {
    return <output className="empty-state">{vi.api.loading}</output>;
  }

  return (
    <div className={styles.immersiveRoot}>
      {/* Nội dung chính: 3 Panel Đồng bộ theo activePost */}
      <div
        className={`${styles.viewerGrid} ${gridLayoutClass} ${isLayoutAnimated ? '' : styles.layoutStatic}`}
      >
        {/* ================================================================
            1. LEFT PANEL — ATTACHED ITINERARY (Dùng chung ItinerarySidebarPanel chuẩn 1 style)
            ================================================================ */}
        {showLeftPanel && (
          <ItinerarySidebarPanel
            className={styles.itineraryInReels}
            trip={hasItinerary ? trip : null}
            postTitle={activePost?.title}
            hashtags={activePost?.hashtags}
            coverImage={coverImage}
            isOpen={showLeftPanel}
            onClose={() => setLeftOpen(false)}
          />
        )}

        {/* ================================================================
            2. CENTER PANEL — IMMERSIVE MEDIA VIEWER + VERTICAL ACTION BAR
            ================================================================ */}
        <section
          ref={centerPanelRef}
          className={styles.centerPanel}
          aria-label={activePost ? activePost.title : vi.api.feedNavAria}
        >
            {filterMode === 'saved' && !user ? (
              <div className={`empty-state ${styles.centerEmptyBox}`}>
                <p>{vi.api.loginRequired}</p>
                <Link prefetch={false} href={loginReturnHref} className={styles.createPostBtn}>
                  {vi.api.login}
                </Link>
              </div>
            ) : postsQuery.isPending ? (
              <output className="empty-state">{vi.api.loading}</output>
            ) : postsQuery.error ? (
              <div className={styles.centerEmptyBox}>
                <ApiErrorNotice
                  error={postsQuery.error}
                  retry={() => {
                    void postsQuery.refetch();
                  }}
                />
              </div>
            ) : !activePost ? (
              <p className="empty-state">
                {filterMode === 'saved' ? vi.api.noBookmarks : vi.api.noPosts}
              </p>
            ) : (
              <>
                <div
                  ref={stageFrameRef}
                  className={styles.mediaStageFrame}
                >
                  {/* Top-Left Volume + Slider & Top-Right Hover Controls (More / Fullscreen) */}
                  <>
                    {reelCard?.video && activePost.postType === 'video' && !isMediaError && (
                      <div className={styles.stageTopLeftControls}>
                        <div className={styles.volumeControlPill}>
                          <button
                            type="button"
                            className={styles.volumeToggleBtn}
                            aria-label={
                              isMuted ? vi.api.immersiveUnmuteVideo : vi.api.immersiveMuteVideo
                            }
                            onClick={() => {
                              const nextMuted = !isMuted;
                              setMuted(nextMuted);
                              if (!nextMuted && volume === 0) {
                                setVolume(0.8);
                                if (videoRef.current) videoRef.current.volume = 0.8;
                              }
                              if (videoRef.current) {
                                videoRef.current.muted = nextMuted;
                              }
                            }}
                          >
                            <SocialIcon
                              name={isMuted || volume === 0 ? 'volumeOff' : 'volumeOn'}
                              size={18}
                            />
                          </button>
                          <div className={styles.volumeSliderWrap}>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              aria-label={vi.api.immersiveMuteVideo}
                              className={styles.volumeRangeInput}
                              onChange={(event) => {
                                const nextVol = Number(event.target.value);
                                setVolume(nextVol);
                                const nextMuted = nextVol === 0;
                                setMuted(nextMuted);
                                if (videoRef.current) {
                                  videoRef.current.volume = nextVol;
                                  videoRef.current.muted = nextMuted;
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={styles.stageTopControls}>
                      <Link
                        prefetch={false}
                        href={`/trips/${activePost.id}`}
                        className={styles.stageCircleBtn}
                        aria-label={vi.api.postMoreOptions}
                        title={vi.api.detail}
                      >
                        <SocialIcon name="more" size={18} />
                      </Link>
                    </div>
                  </>

                  {/* Media Track: Vung cuon momentum doc voi proximity snap ben trong Viewport 9:16 co dinh */}
                  <div
                    ref={trackScrollRef}
                    className={styles.mediaTrack}
                    onScroll={handleTrackScroll}
                    tabIndex={-1}
                  >
                    {posts.map((post, idx) => {
                      const renderMode = getReelRenderMode(idx, activeIndex);
                      if (renderMode === 'placeholder') {
                        // Khung rỗng cùng kích thước để vị trí cuộn và snap theo chỉ số vẫn đúng.
                        return (
                          <div
                            key={post.id}
                            ref={(el) => {
                              mediaItemRefs.current[idx] = el;
                            }}
                            className={styles.mediaItem}
                            data-index={idx}
                            data-post-id={post.id}
                            aria-hidden="true"
                          />
                        );
                      }
                      return (
                        <MediaTrackItem
                          key={post.id}
                          itemRef={(el) => {
                            mediaItemRefs.current[idx] = el;
                          }}
                          index={idx}
                          post={post}
                          isActive={idx === activeIndex}
                          hasVideo={renderMode === 'video'}
                          hasBackdrop={shouldShowReelBackdrop(idx, activeIndex)}
                          actions={renderReelActions(post, idx === activeIndex)}
                          reelCard={reelMap.get(post.id)}
                          user={user}
                          videoRef={idx === activeIndex ? videoRef : undefined}
                          isMuted={isMuted}
                          isPlaying={isPlaying}
                          showPlayFlash={showPlayFlash}
                          mediaErrorPostId={mediaErrorPostId}
                          onMediaError={(pId) => setMediaErrorPostId(pId)}
                          onTogglePlay={togglePlayPause}
                          captionExpandedPostId={captionExpandedPostId}
                          onToggleCaption={(pId) =>
                            setCaptionExpandedPostId((prev) => (prev === pId ? null : pId))
                          }
                          onOpenTag={(tag) => onSearchKeywordChange?.(tag)}
                          onOpenItinerary={(pId) => {
                            if (activePostId !== pId) setActivePostId(pId);
                            setLeftOpen(true);
                          }}
                        />
                      );
                    })}
                  </div>
                  {isPostNotFound && (
                    <div className={styles.postUnavailableOverlay} role="alert">
                      <div className={styles.postUnavailableIcon} aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <h3 className={styles.postUnavailableTitle}>{vi.api.postUnavailable}</h3>
                      <p className={styles.postUnavailableDesc}>{vi.api.postUnavailableHint}</p>
                      {posts.length > 1 && (
                        <button
                          type="button"
                          className={styles.postUnavailableNextBtn}
                          onClick={() => navigateStep(1)}
                        >
                          {vi.api.postUnavailableNext}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cụm chuyển bài (Lên / Xuống): canh giữa theo chiều cao khung, độc lập với cột tương tác */}
                  <div className={styles.navArrowsCluster}>
                    <button
                      type="button"
                      className={styles.navArrowBtn}
                      aria-label={vi.api.immersivePrevPost}
                      title={vi.api.immersivePrevPost}
                      disabled={activeIndex <= 0}
                      onClick={() => navigateStep(-1)}
                    >
                      <SocialIcon name="arrowUp" size={20} />
                    </button>
                    <button
                      type="button"
                      className={styles.navArrowBtn}
                      aria-label={vi.api.immersiveNextPost}
                      title={vi.api.immersiveNextPost}
                      disabled={activeIndex >= posts.length - 1 && !postsQuery.hasNextPage}
                      onClick={() => navigateStep(1)}
                    >
                      <SocialIcon name="arrowDown" size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ================================================================
              3. RIGHT PANEL — COMMENTS ONLY
              ================================================================ */}
          {showRightPanel && activePost && (
            <aside className={styles.rightPanel} aria-label={vi.api.commentPanelAria}>
              <div className={styles.panelHeaderBar}>
                <h2 className={styles.panelHeaderTitle}>
                  <span className={styles.panelHeaderIcon}>
                    <SocialIcon name="comment" size={16} />
                  </span>
                  {t('api.commentPanelTabComments', { count: displayComments })}
                </h2>

                <button
                  type="button"
                  className={styles.iconGhostBtn}
                  aria-label={vi.api.commentPanelClose}
                  title={vi.api.commentPanelClose}
                  onClick={() => setRightOpen(false)}
                >
                  <SocialIcon name="close" size={17} />
                </button>
              </div>

              <ApiErrorNotice error={engagementMutation.error} />

              <RightPanelCommentsSynchronized
                key={activePost.id}
                post={activePost}
                loginHref={loginReturnHref}
                scrollContainerRef={rightScrollRef}
                composerInputRef={commentInputRef}
                showSummary
              />
            </aside>
          )}
        </div>

      {/* Modal Đăng bài nhanh (Chỉ render nội bộ nếu component chạy độc lập, không có onOpenComposer từ cấp cha) */}
      {!onOpenComposer && isComposerModalOpen && user && (
        <ComposerModal
          initialView="compose"
          initialPostType="video"
          onClose={() => setComposerModalOpen(false)}
        />
      )}
    </div>
  );
}

interface CommentDraft {
  body: string;
  replyTarget: { id: string; authorName: string } | null;
}

const COMMENT_DRAFTS_STORAGE_KEY = 'tripflix.comment_drafts';

function getCommentDraft(postId: string): CommentDraft | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(COMMENT_DRAFTS_STORAGE_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, CommentDraft>;
    return map[postId];
  } catch {
    return undefined;
  }
}

function saveCommentDraft(postId: string, draft: CommentDraft | null) {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(COMMENT_DRAFTS_STORAGE_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, CommentDraft>;
    if (draft && (draft.body.trim() || draft.replyTarget)) {
      map[postId] = draft;
    } else {
      delete map[postId];
    }
    sessionStorage.setItem(COMMENT_DRAFTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Luồng bình luận cha–con đồng bộ theo postId ở Right Panel,
 * đi kèm Sticky Comment Composer cố định ở đáy Right Panel.
 */
export function RightPanelCommentsSynchronized({
  post,
  loginHref,
  scrollContainerRef,
  composerInputRef,
  showSummary = false,
}: {
  post: {
    id: string;
    authorId: string;
    authorName?: string | null;
    isVerified?: boolean;
  };
  loginHref: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  composerInputRef: React.RefObject<HTMLInputElement | null>;
  /** Tóm tắt AI ở đầu bình luận: chỉ màn Reels bật (giống mobile); tab Bài viết dùng chung panel nhưng không bật. */
  showSummary?: boolean;
}) {
  const { user, isReady, session } = useApiSession();
  const client = useQueryClient();
  const initialDraft = getCommentDraft(post.id);
  const [body, setBody] = useState(initialDraft?.body ?? '');
  const [isEmojiOpen, setEmojiOpen] = useState(false);
  // Cả viên thuốc nhập (ô chữ và nút emoji) tính là bên trong bảng emoji: bấm vào để gõ không đóng bảng.
  const composerFieldRef = useRef<HTMLDivElement | null>(null);
  const closeEmojiPicker = useCallback(() => setEmojiOpen(false), []);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(
    initialDraft?.replyTarget ?? null,
  );

  const handleBodyChange = (value: string) => {
    setBody(value);
    saveCommentDraft(post.id, { body: value, replyTarget });
  };

  /** Chèn emoji đúng chỗ con trỏ rồi trả focus về ô nhập để gõ tiếp. */
  const handleInsertEmoji = (emoji: string) => {
    const input = composerInputRef.current;
    const next = insertAtSelection(body, input?.selectionStart ?? null, input?.selectionEnd ?? null, emoji);
    handleBodyChange(next.value);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleReplySelect = (target: { id: string; authorName: string } | null) => {
    setReplyTarget(target);
    saveCommentDraft(post.id, { body, replyTarget: target });
    if (target) {
      composerInputRef.current?.focus();
    }
  };

  const query = useInfiniteQuery({
    queryKey: ['social', 'comments', post.id, undefined, user?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(post.id, pageParam, undefined, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      try {
        return await socialApi.addComment(post.id, body.trim(), replyTarget?.id);
      } catch (error: unknown) {
        const errObj = error as {
          response?: { data?: { code?: string } };
          body?: { code?: string };
          message?: string;
          status?: number;
        };
        const code = errObj?.response?.data?.code || errObj?.body?.code || '';
        const isUnverified =
          code === 'email_unverified' ||
          errObj?.status === 403 ||
          Boolean(errObj?.message?.includes('email_unverified'));
        if (isUnverified && session) {
          try {
            await session.refreshUser();
            return await socialApi.addComment(post.id, body.trim(), replyTarget?.id);
          } catch {
            throw error;
          }
        }
        throw error;
      }
    },
    onSuccess: async () => {
      saveCommentDraft(post.id, null);
      setBody('');
      setReplyTarget(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
      ]);
    },
  });

  const comments = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div
        ref={scrollContainerRef}
        className={styles.rightScrollArea}
      >
        {showSummary && <ReelCommentSummary key={post.id} postId={post.id} />}
        <ApiErrorNotice error={addMutation.error} />
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {query.isPending && <CommentSkeletonList count={8} />}
        {query.isSuccess && comments.length === 0 && (
          <p className="small muted">{vi.api.noComments}</p>
        )}

        <ol className={styles.panelCommentList}>
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              postId={post.id}
              postAuthorId={post.authorId}
              postIsVerified={post.isVerified}
              comment={comment}
              loginHref={loginHref}
              onReplySelect={(target) => handleReplySelect(target)}
            />
          ))}
        </ol>

        {query.hasNextPage && (
          <button
            type="button"
            className={styles.utilityBtn}
            disabled={query.isFetchingNextPage}
            onClick={() => {
              void query.fetchNextPage();
            }}
          >
            {vi.api.commentLoadMore}
          </button>
        )}
      </div>

      {/* Sticky Comment Composer cố định ở đáy Right Panel */}
      <div className={styles.stickyComposerBox}>
        {replyTarget && (
          <div className={styles.replyingBanner}>
            <span>{t('api.immersiveReplyingTo', { name: replyTarget.authorName })}</span>
            <button
              type="button"
              className={styles.panelCommentActionBtn}
              aria-label={vi.api.immersiveCancelReply}
              onClick={() => handleReplySelect(null)}
            >
              {vi.api.cancel}
            </button>
          </div>
        )}
        {user ? (
          <form
            className={styles.panelComposerForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (!body.trim()) return;
              addMutation.mutate();
            }}
          >
            <div className={styles.avatarSmallWrap}>
              <span className={styles.avatarSmall} data-tone={getAvatarTone(user.displayName)} aria-hidden="true">
                {getInitial(user.displayName)}
              </span>
              {user.emailVerified && (
                <span className={styles.composerVerifiedBadge} title="Tài khoản đã xác thực">
                  <SocialIcon name="verified" size={11} />
                </span>
              )}
            </div>
            <div ref={composerFieldRef} className={styles.panelComposerField}>
              <input
                ref={composerInputRef}
                className={styles.panelComposerInput}
                aria-label={vi.api.commentInputPlaceholder}
                placeholder={vi.api.commentInputPlaceholder}
                value={body}
                maxLength={10000}
                onChange={(event) => handleBodyChange(event.target.value)}
              />
              <button
                type="button"
                className={`${styles.panelEmojiBtn} ${isEmojiOpen ? styles.panelEmojiBtnActive : ''}`}
                aria-label={vi.api.emojiPickerToggle}
                aria-expanded={isEmojiOpen}
                aria-haspopup="dialog"
                // Giữ focus ở ô nhập khi bấm nút, rồi đưa con trỏ vào ô nhập để gõ được ngay.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setEmojiOpen((open) => !open);
                  composerInputRef.current?.focus();
                }}
              >
                <SocialIcon name="smile" size={20} />
              </button>
              {isEmojiOpen && (
                <EmojiPicker keepOpenRef={composerFieldRef} onSelect={handleInsertEmoji} onClose={closeEmojiPicker} />
              )}
            </div>
            <button
              type="submit"
              className={styles.panelSendBtn}
              aria-label={vi.api.send}
              disabled={addMutation.isPending || !body.trim()}
            >
              <SocialIcon name="send" size={15} />
            </button>
          </form>
        ) : !isReady ? (
          <div className={styles.composerLoadingPlaceholder}>
            <span className="small muted">Đang kiểm tra phiên đăng nhập...</span>
          </div>
        ) : (
          <Link prefetch={false} className="comment-login" href={loginHref}>
            {vi.api.commentLogin}
          </Link>
        )}
      </div>
    </>
  );
}

function CommentNode({
  postId,
  postAuthorId,
  postIsVerified,
  comment,
  isReply = false,
  loginHref,
  onReplySelect,
}: {
  postId: string;
  postAuthorId: string;
  postIsVerified?: boolean;
  comment: {
    id: string;
    authorId: string;
    body: string;
    createdAt: string;
    isEdited: boolean;
    likeCount: number;
    isLiked: boolean;
    authorName?: string | null;
  };
  isReply?: boolean;
  loginHref: string;
  onReplySelect: (target: { id: string; authorName: string }) => void;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const isMine = comment.authorId === user?.id;
  const isPostAuthor = comment.authorId === postAuthorId;
  const authorDisplay = formatAuthorDisplay(comment.authorId, comment.authorName, user?.id, user?.displayName);
  const isAuthorVerified = (isMine && Boolean(user?.emailVerified)) || (isPostAuthor && Boolean(postIsVerified));

  const isCommentLiked = optimisticLiked ?? comment.isLiked;
  const displayCommentLikes = Math.max(
    0,
    comment.likeCount + Number(isCommentLiked) - Number(comment.isLiked),
  );

  const repliesQuery = useInfiniteQuery({
    queryKey: ['social', 'comments', postId, comment.id, user?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !isReply && showReplies,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(postId, pageParam, comment.id, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const commentReactionMutation = useMutation({
    mutationFn: async (nextLiked: boolean) =>
      (
        await commentsControllerSetCommentReaction(comment.id, {
          type: nextLiked ? 'like' : null,
        })
      ).data,
    onMutate: (nextLiked) => {
      const previous = optimisticLiked;
      setOptimisticLiked(nextLiked);
      return { previous };
    },
    onError: (_, __, context) => {
      setOptimisticLiked(context?.previous ?? null);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['social', 'comments', postId] });
      setOptimisticLiked(null);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (action: 'edit' | 'delete') => {
      if (action === 'delete') return socialApi.deleteComment(comment.id);
      return socialApi.editComment(comment.id, editBody.trim());
    },
    onSuccess: async (_, action) => {
      if (action === 'edit') setEditing(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'], refetchType: 'none' }),
      ]);
    },
  });

  const replies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const totalReplies = (comment as { replyCount?: number }).replyCount ?? repliesQuery.data?.pages[0]?.total ?? replies.length;

  return (
    <li className={styles.panelCommentItem}>
      <div className={styles.panelCommentRow}>
        <span className={styles.avatarSmall} data-tone={getAvatarTone(authorDisplay.name)} aria-hidden="true">
          {getInitial(authorDisplay.name)}
        </span>
        <div className={styles.panelCommentContent}>
          <div className={styles.panelCommentMeta}>
            <span className={styles.panelCommentAuthor}>{authorDisplay.name}</span>
            {isAuthorVerified && (
              <span className={styles.commentVerifiedIcon} title="Tài khoản đã xác minh">
                <SocialIcon name="verified" size={13} />
              </span>
            )}
            {isPostAuthor && (
              <span className={styles.authorRoleTag}>{vi.api.immersiveAuthorBadge}</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatDateVi(comment.createdAt)}</span>
            {comment.isEdited && <span>({vi.api.commentEdited})</span>}
          </div>

          <ApiErrorNotice error={commentMutation.error ?? commentReactionMutation.error} />

          {isEditing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!editBody.trim()) return;
                commentMutation.mutate('edit');
              }}
            >
              <textarea
                className={styles.composerTextarea}
                aria-label={vi.api.edit}
                rows={2}
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
              />
              <div className={styles.panelCommentActions}>
                <button
                  type="submit"
                  className={styles.panelCommentActionBtn}
                  disabled={commentMutation.isPending || !editBody.trim()}
                >
                  {vi.api.save}
                </button>
                <button
                  type="button"
                  className={styles.panelCommentActionBtn}
                  onClick={() => setEditing(false)}
                >
                  {vi.api.cancel}
                </button>
              </div>
            </form>
          ) : (
            <p className={styles.panelCommentText}>{comment.body}</p>
          )}

          {!isEditing && (
            <div className={styles.panelCommentActions}>
              {user ? (
                <button
                  type="button"
                  className={`${styles.panelCommentActionBtn} ${
                    isCommentLiked ? styles.panelCommentActionLiked : ''
                  }`}
                  aria-pressed={isCommentLiked}
                  aria-label={vi.api.like}
                  disabled={commentReactionMutation.isPending}
                  onClick={() => commentReactionMutation.mutate(!isCommentLiked)}
                >
                  <SocialIcon name={isCommentLiked ? 'heartFilled' : 'heart'} size={13} />
                  <span>{displayCommentLikes}</span>
                </button>
              ) : (
                <Link
                  prefetch={false}
                  href={loginHref}
                  className={styles.panelCommentActionBtn}
                  aria-label={vi.api.like}
                >
                  <SocialIcon name="heart" size={13} />
                  <span>{displayCommentLikes}</span>
                </Link>
              )}

              {!isReply && (
                <>
                  <button
                    type="button"
                    className={styles.panelCommentActionBtn}
                    onClick={() => {
                      setShowReplies(true);
                      onReplySelect({ id: comment.id, authorName: authorDisplay.name });
                    }}
                  >
                    {vi.api.commentReplyAction}
                  </button>
                  {totalReplies > 0 && (
                    <button
                      type="button"
                      className={styles.panelCommentActionBtn}
                      aria-expanded={showReplies}
                      onClick={() => setShowReplies((prev) => !prev)}
                    >
                      {showReplies
                        ? vi.api.commentHideReplies
                        : `${vi.api.commentViewReplies} (${totalReplies})`}
                    </button>
                  )}
                </>
              )}

              {isMine && (
                <>
                  <button
                    type="button"
                    className={styles.panelCommentActionBtn}
                    disabled={commentMutation.isPending}
                    onClick={() => {
                      setEditBody(comment.body);
                      setEditing(true);
                    }}
                  >
                    {vi.api.edit}
                  </button>
                  <button
                    type="button"
                    className={styles.panelCommentActionBtn}
                    disabled={commentMutation.isPending}
                    onClick={() => commentMutation.mutate('delete')}
                  >
                    {vi.api.remove}
                  </button>
                </>
              )}
            </div>
          )}

          {!isReply && showReplies && replies.length > 0 && (
            <div className={styles.panelReplyWrapper}>
              <ol className={styles.panelCommentList}>
                {replies.map((reply) => (
                  <CommentNode
                    key={reply.id}
                    postId={postId}
                    postAuthorId={postAuthorId}
                    postIsVerified={postIsVerified}
                    comment={reply}
                    isReply
                    loginHref={loginHref}
                    onReplySelect={onReplySelect}
                  />
                ))}
              </ol>
              {repliesQuery.hasNextPage && (
                <button
                  type="button"
                  className={styles.panelCommentActionBtn}
                  disabled={repliesQuery.isFetchingNextPage}
                  onClick={() => {
                    void repliesQuery.fetchNextPage();
                  }}
                >
                  {vi.api.commentLoadMore}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

interface ItineraryItemState {
  id: string;
  day: number;
  title: string;
  location: string;
  notes: string;
}

export interface ComposerModalProps {
  onClose: () => void;
  initialView?: 'compose' | 'drafts';
  initialDraftId?: string | null;
  initialPostType?: 'video' | 'vlog';
}

/** Modal tạo và quản lý bài đăng / bản nháp */
export function ComposerModal({
  onClose,
  initialView = 'compose',
  initialDraftId = null,
  initialPostType = 'vlog',
}: ComposerModalProps) {
  const client = useQueryClient();
  const { user } = useApiSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Chế độ xem: 'compose' (soạn thảo) hoặc 'drafts' (danh sách bản nháp)
  const [viewMode, setViewMode] = useState<'compose' | 'drafts'>(initialView);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(initialDraftId);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Danh sách các bản nháp của tài khoản hiện tại
  const draftsQuery = useQuery({
    queryKey: ['social', 'my-drafts', user?.id],
    queryFn: ({ signal }) => socialApi.listMyPosts({ status: 'draft', limit: 30 }, signal),
    enabled: Boolean(user?.id),
  });

  const drafts = draftsQuery.data?.items ?? [];
  const draftsCount = drafts.length;

  // Mutation xóa bản nháp
  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: string) => socialApi.deletePost(draftId),
    onSuccess: async (_, deletedId) => {
      if (editingDraftId === deletedId) {
        setEditingDraftId(null);
      }
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });

  // Thông tin bài viết
  const [postType, setPostType] = useState<'video' | 'vlog'>(initialPostType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // Phương tiện (Video)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [existingMediaId, setExistingMediaId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStepText, setUploadStepText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Lịch trình chuyến đi (Trip Attachment)
  const [enableItinerary, setEnableItinerary] = useState(false);
  const [destinationName, setDestinationName] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [daysCount, setDaysCount] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [priceDisclaimer, setPriceDisclaimer] = useState('');
  const [itineraryItems, setItineraryItems] = useState<ItineraryItemState[]>([
    { id: '1', day: 1, title: '', location: '', notes: '' },
  ]);

  // Nạp dữ liệu bản nháp vào form để tiếp tục sửa
  const handleLoadDraft = useCallback((draft: SocialPostDto) => {
    setEditingDraftId(draft.id);
    setTitle(draft.title || '');
    setBody(draft.body || '');
    setPostType(draft.postType === 'video' ? 'video' : 'vlog');
    setHashtagsText((draft.hashtags || []).join(', '));
    setVisibility((draft.visibility as 'public' | 'private') || 'public');
    setExistingMediaId(draft.mediaIds?.[0] || null);
    setVideoFile(null);
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoDuration(null);
    setUploadError(null);
    setSaveSuccessMsg(null);

    if (draft.tripAttachment) {
      setEnableItinerary(true);
      setDestinationName(draft.tripAttachment.destinationName || '');
      setHotelName(draft.tripAttachment.hotelName || '');
      setDaysCount(draft.tripAttachment.daysCount ? String(draft.tripAttachment.daysCount) : '');
      setEstimatedCost(
        draft.tripAttachment.estimatedCostPerPerson
          ? String(draft.tripAttachment.estimatedCostPerPerson)
          : '',
      );
      setPriceDisclaimer(draft.tripAttachment.priceDisclaimer || '');
      if (draft.tripAttachment.items && draft.tripAttachment.items.length > 0) {
        setItineraryItems(
          draft.tripAttachment.items.map((it, idx) => ({
            id: String(idx + 1),
            day: it.day,
            title: it.title,
            location: it.location || '',
            notes: it.notes || '',
          })),
        );
      } else {
        setItineraryItems([{ id: '1', day: 1, title: '', location: '', notes: '' }]);
      }
    } else {
      setEnableItinerary(false);
      setDestinationName('');
      setHotelName('');
      setDaysCount('');
      setEstimatedCost('');
      setPriceDisclaimer('');
      setItineraryItems([{ id: '1', day: 1, title: '', location: '', notes: '' }]);
    }

    setViewMode('compose');
  }, []);

  const handleNewPost = () => {
    setEditingDraftId(null);
    setTitle('');
    setBody('');
    setHashtagsText('');
    setPostType(initialPostType);
    setVisibility('public');
    setExistingMediaId(null);
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setUploadProgress(0);
    setUploadStepText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setEnableItinerary(false);
    setDestinationName('');
    setHotelName('');
    setDaysCount('');
    setEstimatedCost('');
    setPriceDisclaimer('');
    setItineraryItems([{ id: '1', day: 1, title: '', location: '', notes: '' }]);
    setUploadError(null);
    setSaveSuccessMsg(null);
    setViewMode('compose');
  };

  // Tự động load draft nếu có initialDraftId
  useEffect(() => {
    if (!initialDraftId) return;
    void socialApi.getPost(initialDraftId).then((res) => {
      if (res?.post) {
        handleLoadDraft(res.post);
      }
    });
  }, [initialDraftId, handleLoadDraft]);

  // Thu hồi URL preview khi unmount hoặc đổi file để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const handleSelectFile = async (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setVideoFile(null);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
      setVideoDuration(null);
      return;
    }

    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
    const isMov = file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov');
    if (!isMp4 && !isMov) {
      setUploadError('Chỉ hỗ trợ video định dạng .mp4 hoặc .mov');
      return;
    }

    // Giới hạn 1 GB theo quy định của hệ thống
    if (file.size > 1024 * 1024 * 1024) {
      setUploadError('Dung lượng video không được vượt quá 1 GB');
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
        };
        video.onerror = () => {
          reject(new Error('Không thể đọc dữ liệu video'));
        };
        video.src = previewUrl;
      });

      if (duration > 300) {
        URL.revokeObjectURL(previewUrl);
        setUploadError('Thời lượng video tối đa là 5 phút (300 giây)');
        return;
      }

      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoFile(file);
      setVideoPreviewUrl(previewUrl);
      setVideoDuration(Math.max(1, Math.round(duration)));
      setPostType('video');
    } catch {
      setUploadError('Không thể đọc thông tin video. Vui lòng kiểm tra lại định dạng file.');
    }
  };

  const handleRemoveVideo = () => {
    if (isUploading) return;
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setExistingMediaId(null);
    setUploadProgress(0);
    setUploadStepText('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddItem = () => {
    const lastDay = itineraryItems.length > 0 ? itineraryItems[itineraryItems.length - 1]!.day : 1;
    const newId = Math.random().toString(36).substring(2, 9);
    setItineraryItems((prev) => [
      ...prev,
      { id: newId, day: lastDay, title: '', location: '', notes: '' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (itineraryItems.length <= 1) {
      setItineraryItems([{ id: '1', day: 1, title: '', location: '', notes: '' }]);
      return;
    }
    setItineraryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: 'day' | 'title' | 'location' | 'notes',
    value: string | number,
  ) => {
    setItineraryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const uploadVideoMultipart = async (file: File, durationSec: number): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStepText('Đang khởi tạo phiên tải lên...');

    const mimeType =
      file.name.toLowerCase().endsWith('.mov') || file.type === 'video/quicktime'
        ? 'video/quicktime'
        : 'video/mp4';

    const createRes = await mediaUploadControllerCreateUpload({
      mimeType,
      fileSizeBytes: file.size,
      durationSec,
    });

    if (createRes.status !== 201) {
      const err = createRes.data as { message?: string };
      throw new Error(err?.message || 'Khởi tạo tải lên video thất bại');
    }

    const { assetId, parts, partSizeBytes } = createRes.data;
    const uploadedParts: Array<{ partNumber: number; etag: string }> = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const start = i * partSizeBytes;
      const end = Math.min(file.size, start + partSizeBytes);
      const chunk = file.slice(start, end);

      setUploadStepText(`Đang tải lên phần ${part.partNumber}/${parts.length}...`);

      const { etag } = await uploadChunkToPresignedUrl(part.url, chunk);

      uploadedParts.push({
        partNumber: part.partNumber,
        etag: etag || `"${part.partNumber}"`,
      });

      const percent = Math.round(((i + 1) / parts.length) * 80) + 5;
      setUploadProgress(percent);
    }

    setUploadStepText('Đang hoàn tất và xử lý video...');
    const completeRes = await mediaUploadControllerCompleteUpload(assetId, {
      parts: uploadedParts,
    });

    if (completeRes.status !== 202) {
      const err = completeRes.data as { message?: string };
      throw new Error(err?.message || 'Hoàn tất tải lên video thất bại');
    }

    setUploadProgress(100);
    setUploadStepText('Tải video thành công!');
    return assetId;
  };

  const saveMutation = useMutation({
    mutationFn: async ({ shouldPublish }: { shouldPublish: boolean }) => {
      setUploadError(null);
      setSaveSuccessMsg(null);

      if (shouldPublish) {
        if (!title.trim() || !body.trim()) {
          throw new Error('Vui lòng điền tiêu đề và nội dung bài viết trước khi đăng.');
        }
        if (postType === 'video' && !videoFile && !existingMediaId) {
          throw new Error('Vui lòng chọn hoặc tải lên một video cho bài viết dạng Video ngắn.');
        }
      } else {
        if (!title.trim() && !body.trim()) {
          throw new Error('Vui lòng nhập ít nhất tiêu đề hoặc nội dung để lưu bản nháp.');
        }
      }

      let uploadedAssetId: string | undefined = existingMediaId || undefined;
      if (videoFile && videoDuration) {
        uploadedAssetId = await uploadVideoMultipart(videoFile, videoDuration);
        setExistingMediaId(uploadedAssetId);
      }

      const parsedTags = hashtagsText
        .split(/[,\s#]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      let tripAttachment: TripAttachmentDto | undefined = undefined;
      if (enableItinerary && destinationName.trim()) {
        const filteredItems: TripItineraryItemDto[] = itineraryItems
          .filter((item) => item.title.trim().length > 0)
          .map((item) => ({
            day: Number(item.day) || 1,
            title: item.title.trim(),
            ...(item.location.trim() ? { location: item.location.trim() } : {}),
            ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
          }));

        const parsedDays = parseInt(daysCount, 10);
        const parsedCost = parseInt(estimatedCost.replace(/\D/g, ''), 10);

        tripAttachment = {
          destinationName: destinationName.trim(),
          ...(hotelName.trim() ? { hotelName: hotelName.trim() } : {}),
          ...(!Number.isNaN(parsedDays) && parsedDays > 0 ? { daysCount: parsedDays } : {}),
          ...(!Number.isNaN(parsedCost) && parsedCost > 0 ? { estimatedCostPerPerson: parsedCost } : {}),
          ...(priceDisclaimer.trim() ? { priceDisclaimer: priceDisclaimer.trim() } : {}),
          ...(filteredItems.length > 0 ? { items: filteredItems } : {}),
        };
      }

      let currentId = editingDraftId;

      if (currentId) {
        const patchPayload: UpdatePostDto = {
          title: title.trim() || 'Bản nháp',
          body: body.trim(),
          hashtags: parsedTags,
          visibility,
          ...(uploadedAssetId ? { media_ids: [uploadedAssetId], cover_media_id: uploadedAssetId } : {}),
          ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
        };
        await socialApi.updatePost(currentId, patchPayload);
      } else {
        const draftPayload = {
          post_type: postType,
          title: title.trim() || 'Bản nháp',
          body: body.trim(),
          hashtags: parsedTags,
          visibility,
          ...(uploadedAssetId ? { media_ids: [uploadedAssetId], cover_media_id: uploadedAssetId } : {}),
          ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
        };
        const draft = await socialApi.createDraft(draftPayload);
        currentId = draft.id;
        setEditingDraftId(draft.id);
      }

      if (shouldPublish && currentId) {
        await socialApi.publishPost(currentId);
      }

      return { id: currentId, published: shouldPublish };
    },
    onSuccess: async (data) => {
      await client.invalidateQueries({ queryKey: ['social'] });
      if (data.published) {
        onClose();
      } else {
        setSaveSuccessMsg('Đã lưu bản nháp thành công.');
      }
    },
    onError: (err: unknown) => {
      setIsUploading(false);
      if (err instanceof HttpError && typeof err.body === 'object' && err.body !== null) {
        const bodyObj = err.body as { message?: string; code?: string };
        setUploadError(bodyObj.message || `Lỗi yêu cầu (${err.status})`);
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('Đã có lỗi xảy ra.');
      }
    },
  });

  const isFormBusy = saveMutation.isPending || isUploading;

  // View danh sách các bản nháp
  if (viewMode === 'drafts') {
    return (
      <dialog open className={styles.modalBackdrop} aria-label="Bản nháp của bạn">
        <div className={styles.composerModalCard}>
          <div className={styles.panelHeaderBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className={styles.panelHeaderTitle}>Bản nháp của bạn</h3>
              <span className={styles.composerSectionBadge}>{draftsCount}</span>
            </div>
            <div className={styles.composerHeaderActions}>
              <button
                type="button"
                className={styles.composerHeaderDraftsBtn}
                onClick={handleNewPost}
              >
                <SocialIcon name="plus" size={14} />
                <span>Viết bài mới</span>
              </button>
              <button
                type="button"
                className={styles.iconGhostBtn}
                aria-label={vi.api.cancel}
                onClick={onClose}
              >
                <SocialIcon name="close" size={18} />
              </button>
            </div>
          </div>

          <div className={styles.draftsListContainer}>
            {draftsQuery.isLoading ? (
              <div className={styles.draftEmptyState}>
                <output>Đang tải danh sách bản nháp...</output>
              </div>
            ) : drafts.length === 0 ? (
              <div className={styles.draftEmptyState}>
                <SocialIcon name="bookmark" size={32} />
                <p>Bạn chưa có bản nháp nào được lưu.</p>
                <button
                  type="button"
                  className={styles.createPostBtn}
                  onClick={() => setViewMode('compose')}
                >
                  Bắt đầu viết bài
                </button>
              </div>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className={styles.draftCard}>
                  <div className={styles.draftCardTop}>
                    <div>
                      <h4 className={styles.draftTitle}>
                        {draft.title || '(Chưa có tiêu đề)'}
                      </h4>
                      {draft.body && (
                        <p className={styles.draftSnippet}>{draft.body}</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.draftMeta}>
                    <span className={styles.draftBadge}>
                      {draft.postType === 'video' ? 'Video' : 'Bài viết'}
                    </span>
                    {draft.tripAttachment?.destinationName && (
                      <span className={styles.draftBadge}>
                        {draft.tripAttachment.destinationName}
                      </span>
                    )}
                    <span>
                      {new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className={styles.draftActions}>
                    <button
                      type="button"
                      className={styles.draftDeleteBtn}
                      disabled={deleteDraftMutation.isPending}
                      onClick={() => deleteDraftMutation.mutate(draft.id)}
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      className={styles.draftResumeBtn}
                      onClick={() => handleLoadDraft(draft)}
                    >
                      Tiếp tục soạn
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.composerModalFooter}>
            <button
              type="button"
              className={styles.utilityBtn}
              onClick={() => setViewMode('compose')}
            >
              Quay lại soạn thảo
            </button>
          </div>
        </div>
      </dialog>
    );
  }

  // View soạn thảo bài viết
  return (
    <dialog open className={styles.modalBackdrop} aria-label={vi.api.feedCreatePostCta}>
      <form
        className={styles.composerModalCard}
        onSubmit={(event) => {
          event.preventDefault();
          if (isFormBusy) return;
          saveMutation.mutate({ shouldPublish: true });
        }}
      >
        {/* Tiêu đề modal */}
        <div className={styles.panelHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className={styles.panelHeaderTitle}>
              {editingDraftId ? 'Chỉnh sửa bản nháp' : vi.api.feedCreatePostCta}
            </h3>
            {editingDraftId && (
              <span className={styles.editingDraftBadge}>Đang chỉnh sửa bản nháp</span>
            )}
          </div>
          <div className={styles.composerHeaderActions}>
            <button
              type="button"
              className={styles.composerHeaderDraftsBtn}
              onClick={() => setViewMode('drafts')}
              disabled={isFormBusy}
            >
              <SocialIcon name="bookmark" size={14} />
              <span>Bản nháp ({draftsCount})</span>
            </button>
            <button
              type="button"
              className={styles.iconGhostBtn}
              aria-label={vi.api.cancel}
              disabled={isFormBusy}
              onClick={onClose}
            >
              <SocialIcon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Thông báo lưu nháp thành công */}
        {saveSuccessMsg && (
          <output className={styles.saveSuccessBanner}>
            <SocialIcon name="sparkles" size={16} />
            <span>{saveSuccessMsg}</span>
          </output>
        )}

        {/* 1. Chọn loại bài viết: [ Bài viết ] [ Reels (Video) ] */}
        <div className={styles.composerTypeToggle}>
          <button
            type="button"
            className={`${styles.composerTypeBtn} ${postType === 'vlog' ? styles.composerTypeBtnActive : ''}`}
            onClick={() => {
              // Bài viết không được kèm video: bỏ video đã chọn khi chuyển loại.
              if (videoFile || existingMediaId) handleRemoveVideo();
              setPostType('vlog');
            }}
            disabled={isFormBusy}
          >
            <SocialIcon name="compass" size={16} />
            <span>Bài viết</span>
          </button>
          <button
            type="button"
            className={`${styles.composerTypeBtn} ${postType === 'video' ? styles.composerTypeBtnActive : ''}`}
            onClick={() => setPostType('video')}
            disabled={isFormBusy}
          >
            <SocialIcon name="video" size={16} />
            <span>Reels (Video)</span>
          </button>
        </div>

        {/* 2. Thông tin nội dung bài viết */}
        <div className={styles.composerSection}>
          <div className={styles.composerSectionHeader}>
            <h4 className={styles.composerSectionTitle}>Nội dung bài viết</h4>
            <span className={styles.composerSectionBadge}>Bắt buộc</span>
          </div>

          <input
            className={styles.composerInput}
            aria-label={vi.api.title}
            placeholder={vi.api.composerTitlePlaceholder}
            required
            maxLength={255}
            value={title}
            disabled={isFormBusy}
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className={styles.composerTextarea}
            aria-label={vi.api.body}
            placeholder={vi.api.composerPlaceholder}
            required
            rows={3}
            value={body}
            disabled={isFormBusy}
            onChange={(event) => setBody(event.target.value)}
          />

          <div className={styles.composerMetaRow}>
            <input
              className={styles.composerInput}
              aria-label={vi.api.hashtags}
              placeholder={vi.api.composerHashtagPlaceholder}
              value={hashtagsText}
              disabled={isFormBusy}
              onChange={(event) => setHashtagsText(event.target.value)}
            />

            <select
              className={styles.composerInput}
              value={visibility}
              disabled={isFormBusy}
              onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
              aria-label="Quyền riêng tư"
            >
              <option value="public">Công khai với mọi người</option>
              <option value="private">Chỉ mình tôi</option>
            </select>
          </div>
        </div>

        {/* 3. Video Reels: bài viết (vlog) không được kèm video nên chỉ hiện khi chọn Reels */}
        {postType === 'video' && (
        <div className={styles.composerSection}>
          <div className={styles.composerSectionHeader}>
            <h4 className={styles.composerSectionTitle}>
              <SocialIcon name="video" size={16} />
              <span>Video Reels</span>
            </h4>
            <span className={styles.composerSectionBadge}>Bắt buộc với Reels</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime"
            style={{ display: 'none' }}
            disabled={isFormBusy}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              void handleSelectFile(file);
            }}
          />

          {!videoFile && !existingMediaId ? (
            <button
              type="button"
              className={styles.composerDropzone}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.composerDropzoneIcon}>
                <SocialIcon name="upload" size={22} />
              </div>
              <p className={styles.composerDropzoneText}>Kéo thả hoặc nhấn để chọn video Reels</p>
              <p className={styles.composerDropzoneHint}>Hỗ trợ MP4, MOV (Tối đa 5 phút, 1 GB)</p>
            </button>
          ) : (
            <div className={styles.composerVideoPreviewCard}>
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  controls
                  className={styles.composerVideoElement}
                >
                  <track kind="captions" />
                </video>
              ) : existingMediaId ? (
                <div style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--iv-text)' }}>
                  <span>Video đã lưu trong bản nháp (ID: {existingMediaId.slice(0, 8)}...)</span>
                </div>
              ) : null}

              <div className={styles.composerVideoMeta}>
                <div>
                  {videoFile ? (
                    <>
                      <strong>{videoFile.name}</strong>
                      <span> — {(videoFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                      {videoDuration && <span> ({videoDuration}s)</span>}
                    </>
                  ) : (
                    <span>Đã gắn media từ trước</span>
                  )}
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    className={styles.removeItineraryItemBtn}
                    onClick={handleRemoveVideo}
                    title="Xóa video đã chọn"
                    aria-label="Xóa video đã chọn"
                  >
                    <SocialIcon name="trash" size={16} />
                  </button>
                )}
              </div>

              {isUploading && (
                <div className={styles.composerUploadProgressBox}>
                  <div className={styles.composerProgressText}>
                    <span>{uploadStepText}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className={styles.composerProgressBarBg}>
                    <div
                      className={styles.composerProgressBarFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 4. Lộ trình chuyến đi (Trip Attachment) */}
        <div className={styles.composerSection}>
          <label
            htmlFor="composer-itinerary-checkbox"
            className={styles.composerItineraryToggleRow}
            aria-label="Đính kèm lịch trình chuyến đi"
          >
            <div className={styles.composerItineraryToggleInfo}>
              <div className={styles.composerItineraryToggleTitle}>
                <SocialIcon name="calendar" size={16} />
                <span>Đính kèm lịch trình chuyến đi</span>
              </div>
              <span className={styles.composerItineraryToggleSubtitle}>
                Chia sẻ điểm đến, chi phí và từng điểm dừng trong hành trình
              </span>
            </div>
            <input
              id="composer-itinerary-checkbox"
              type="checkbox"
              className={styles.switchInput}
              checked={enableItinerary}
              disabled={isFormBusy}
              onChange={(e) => setEnableItinerary(e.target.checked)}
            />
          </label>

          {enableItinerary && (
            <div className={styles.composerItineraryContainer}>
              <div className={styles.composerMetaRow}>
                <input
                  className={styles.composerInput}
                  aria-label="Điểm đến chuyến đi"
                  placeholder="Điểm đến (VD: Đà Lạt, Phú Quốc...)"
                  value={destinationName}
                  disabled={isFormBusy}
                  onChange={(e) => setDestinationName(e.target.value)}
                />
                <input
                  className={styles.composerInput}
                  aria-label="Khách sạn / Resort"
                  placeholder="Khách sạn (VD: Terracotta Resort...)"
                  value={hotelName}
                  disabled={isFormBusy}
                  onChange={(e) => setHotelName(e.target.value)}
                />
              </div>

              <div className={styles.composerMetaRow}>
                <input
                  className={styles.composerInput}
                  type="number"
                  min={1}
                  max={30}
                  aria-label="Số ngày đi"
                  placeholder="Số ngày (VD: 3)"
                  value={daysCount}
                  disabled={isFormBusy}
                  onChange={(e) => setDaysCount(e.target.value)}
                />
                <input
                  className={styles.composerInput}
                  aria-label="Chi phí dự tính"
                  placeholder="Chi phí / người (VD: 3.500.000 VNĐ)"
                  value={estimatedCost}
                  disabled={isFormBusy}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>

              <input
                className={styles.composerInput}
                aria-label="Ghi chú chi phí"
                placeholder="Ghi chú chi phí (VD: Giá tham khảo bao gồm vé máy bay và phòng)"
                value={priceDisclaimer}
                disabled={isFormBusy}
                onChange={(e) => setPriceDisclaimer(e.target.value)}
              />

              <div className={styles.composerSectionHeader} style={{ marginTop: '4px' }}>
                <h5 className={styles.composerSectionTitle}>Các hoạt động theo ngày</h5>
                <span className={styles.composerSectionBadge}>{itineraryItems.length} hoạt động</span>
              </div>

              {itineraryItems.map((item, index) => (
                <div key={item.id} className={styles.itineraryItemCard}>
                  <div className={styles.itineraryItemHeader}>
                    <label className={styles.itineraryDaySelect} htmlFor={`itinerary-day-${item.id}`}>
                      Ngày:
                      <select
                        id={`itinerary-day-${item.id}`}
                        className={styles.itineraryDaySelect}
                        value={item.day}
                        disabled={isFormBusy}
                        onChange={(e) => handleUpdateItem(item.id, 'day', Number(e.target.value))}
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Ngày {d}
                          </option>
                        ))}
                      </select>
                    </label>

                    <input
                      className={styles.composerInput}
                      style={{ flex: 1 }}
                      placeholder="Tên hoạt động (VD: Đón bình minh Cầu Gỗ)"
                      value={item.title}
                      disabled={isFormBusy}
                      onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                      required={enableItinerary && index === 0}
                    />

                    <button
                      type="button"
                      className={styles.removeItineraryItemBtn}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isFormBusy}
                      title="Xóa hoạt động này"
                      aria-label="Xóa hoạt động"
                    >
                      <SocialIcon name="trash" size={15} />
                    </button>
                  </div>

                  <div className={styles.composerMetaRow}>
                    <input
                      className={styles.composerInput}
                      placeholder="Địa điểm / Toạ độ (VD: Đồi chè Cầu Đất)"
                      value={item.location}
                      disabled={isFormBusy}
                      onChange={(e) => handleUpdateItem(item.id, 'location', e.target.value)}
                    />
                    <input
                      className={styles.composerInput}
                      placeholder="Ghi chú / Mẹo (VD: Nên đến trước 5h30 để săn mây)"
                      value={item.notes}
                      disabled={isFormBusy}
                      onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className={styles.addItemBtn}
                disabled={isFormBusy}
                onClick={handleAddItem}
              >
                <SocialIcon name="plus" size={15} />
                <span>Thêm hoạt động tiếp theo</span>
              </button>
            </div>
          )}
        </div>

        {/* Thông báo lỗi nếu có */}
        {uploadError && (
          <div className={styles.uploadErrorBanner} role="alert">
            <SocialIcon name="info" size={15} />
            <span>{uploadError}</span>
          </div>
        )}
        <ApiErrorNotice error={saveMutation.error} />

        {/* Nút hành động */}
        <div className={styles.composerModalFooter}>
          <button
            type="button"
            className={styles.utilityBtn}
            onClick={onClose}
            disabled={isFormBusy}
          >
            {vi.api.cancel}
          </button>
          <button
            type="button"
            className={styles.utilityBtn}
            disabled={isFormBusy || (!title.trim() && !body.trim())}
            onClick={() => saveMutation.mutate({ shouldPublish: false })}
          >
            {saveMutation.isPending && !saveMutation.variables?.shouldPublish
              ? 'Đang lưu nháp...'
              : 'Lưu bản nháp'}
          </button>
          <button
            type="submit"
            className={styles.createPostBtn}
            disabled={
              isFormBusy ||
              !title.trim() ||
              !body.trim() ||
              (postType === 'video' && !videoFile && !existingMediaId)
            }
          >
            {isUploading
              ? 'Đang tải video...'
              : saveMutation.isPending && saveMutation.variables?.shouldPublish
                ? vi.api.saving
                : 'Đăng bài viết'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
