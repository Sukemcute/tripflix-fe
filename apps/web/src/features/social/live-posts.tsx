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
  useCommentPermissions,
  usePlaybackSession,
  useRecommendedReelsFeed,
  useReelsByIds,
  useReelsFeed,
  useSocialPosts,
  watchPostComments,
  type PostCommentsChange,
} from '@tripflix/api-client';
import {
  mediaUploadControllerCreateUpload,
  mediaUploadControllerCompleteUpload,
} from '@tripflix/api-client/core-api/media/media';
import type {
  FeedCardDto,
  PostRecommendationsControllerRecommendReelsMode,
  SocialCommentDto,
  SocialPostDto,
  TripAttachmentDto,
  UpdatePostDto,
} from '@tripflix/api-client/core-api/model/index';
import { commentsControllerSetCommentReaction } from '@tripflix/api-client/core-api/social-comments/social-comments';
import {
  buildTripAttachment,
  buildTripDraftFromAttachment,
  createTripPlanDraft,
  getPostTitleFromCaption,
  getReelPlaybackSources,
  getReelPosterPrefetchUrls,
  hasTripPlan,
  selectReelPoster,
  type TripPlanDraft,
} from '@tripflix/app-core';
import { ComposerTripPlanEditor } from './composer/trip-plan-editor';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getInitial } from '@/features/auth/account-helpers';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getPostCover, getPostImages, POST_COVER_MASCOT } from './post-cover';
import { getAvatarTone } from './avatar-tone';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { EmojiPicker } from './emoji-picker';
import { MentionPicker, type MentionUserItem } from './mention-picker';
import {
  getMentionQueryAtCursor,
  insertMentionTag,
  parseCommentSegments,
  updateMentionsOnTextChange,
  type CommentMention,
  type MentionQuery,
} from './mention-input';
import { createCommentWithMentions, editCommentWithMentions } from './comment-service';
import { CommentVisibility } from './comment-visibility';
import { CreatorCommentControls } from './creator-comment-controls';
import { ModeratedComment } from './moderated-comment';
import {
  addCommentToCache,
  removeCommentFromCache,
  replaceCommentInCache,
  setCommentReactionInCache,
  reloadPostComments,
  shiftPostCommentCount,
} from './comment-cache';
import { insertAtSelection } from './emoji-picker-data';
import { useHasUserInteracted } from './use-has-user-interacted';
import { useSettledFlag } from './use-settled-flag';
import {
  canStepToNextReel,
  getReelBufferSeconds,
  getReelRenderMode,
  pickReelAfterRemoval,
  prependPinnedReelCards,
  shouldLoadReelSource,
  shouldShowReelBackdrop,
  toReelPost,
  type ReelPost,
} from './reel-post';
import { attachReelHlsSource, REEL_START_SHORT_SIDE, type ReelHlsBufferControl } from './reel-hls';
import { ReelSeekBar } from './reel-seek-bar';
import { ItinerarySidebarPanel } from './feed/itinerary-sidebar-panel';
import { ReelCommentSummary } from './post-summary';
import { CommentSkeletonList } from './comment-skeleton';
import styles from './live-posts.module.css';
import { PostImagePicker } from './composer/post-image-picker';
import { usePostImages } from './composer/use-post-images';
import { HashtagInput } from './composer/hashtag-input';
import { SoftSelect } from '@/features/shared/soft-select';
import { addPublishedPostToFeeds, publishNoticeStore } from './composer/published-post';
import { calculateUploadPercent, parseStoredHashtags, pickDroppedVideo } from './composer/composer-inputs';
import { ShareMenu, type ShareMenuHandle } from './share-menu';
import { PostOptionsMenu } from './post-options-menu';
import { buildPostHref } from './search-url';
import { LoadingDots } from '@/features/shared/loading-dots';

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
  if (!isReady) return <output><LoadingDots /></output>;
  if (!user) return <Link prefetch={false} href="/login">{vi.api.loginRequired}</Link>;
  return (
    <>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output><LoadingDots /></output>}
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
                <div className={styles.accountCardHeader}><p className="eyebrow">{post.tripAttachment?.destinationName ?? vi.api.posts}</p><PostOptionsMenu post={post} buttonClassName={styles.iconGhostBtn} /></div>
                <h3>
                  {post.status === 'held' ? post.title : <Link prefetch={false} href={buildPostHref(post.id, { postType: post.postType })}>{post.title}</Link>}
                </h3>
                {post.status === 'held' && <p role="status" className="small muted">{vi.moderation.heldPost}</p>}
                <p className={styles.postBodyClamped}>{post.body}</p>
                <p className="small muted">
                  {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments}
                </p>
                {post.status !== 'held' && <Link prefetch={false} href={buildPostHref(post.id, { postType: post.postType })} className="secondary-button">
                  {vi.api.detail}
                </Link>}
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
  /** Có thẻ <video> (bài đang xem, 2 bài phía trước, 1 bài phía sau); bài khác chỉ hiện poster. */
  hasVideo: boolean;
  /** Được gắn nguồn để tải ngay (shouldLoadReelSource); đã gắn rồi thì giữ tới khi rời cửa sổ video. */
  canLoadSource: boolean;
  /** Video của Reel này đã có hình đầu tiên: bài kế tiếp chưa có thì chặn lướt sang. */
  onFirstFrame: (postId: string) => void;
  /** Số giây hls.js đệm trước: 30 cho bài đang xem, 10 cho bài phía trước, 4 cho bài phía sau. */
  bufferSeconds: number;
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

/** Khung rỗng cách bài đang xem tới chừng này bài thì hiện vòng chờ (lướt quá nhanh qua vùng chưa tải). */
const REEL_PLACEHOLDER_SPINNER_RANGE = 6;
/**
 * Cuộn khung Reels tới một bài. Không dùng scrollIntoView: lệnh đó cuộn cả mọi khung cha (kể cả khung
 * `overflow: hidden` của trang), làm cả khung Reels lẫn bình luận bị đẩy lên khi trang cao hơn màn hình vài px.
 */
function scrollTrackToIndex(
  container: HTMLElement,
  targetEl: HTMLElement | null | undefined,
  index: number,
  behavior: ScrollBehavior,
) {
  container.scrollTo({ top: targetEl ? targetEl.offsetTop : index * container.clientHeight, behavior });
}

/** HTMLMediaElement.HAVE_CURRENT_DATA: đã có hình của vị trí hiện tại. */
const HAVE_CURRENT_DATA = 2;
/** Video đang xem chưa chạy sau chừng này thì vẫn cho tải trước bài thứ 2 (video lỗi, trình duyệt chặn tự phát). */
const REEL_PRELOAD_FALLBACK_MS = 2_000;

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
  /** Nhận nút vừa bấm để menu chia sẻ mở cạnh nút. */
  onShare: (anchor: HTMLElement) => void;
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

        <button
          type="button"
          className={styles.verticalActionItem}
          aria-label={vi.api.share}
          onClick={(event) => onShare(event.currentTarget)}
        >
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
  canLoadSource,
  onFirstFrame,
  bufferSeconds,
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
  const hasItinerary = hasTripPlan(trip); // Như app: chỉ có điểm đến mà không có lịch từng ngày hay chỗ ở thì không hiện thẻ lịch trình.

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
  const [isScrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    if (!isActive && localVideoRef.current) {
      localVideoRef.current.pause();
    }
  }, [isActive]);

  // Gắn nguồn ở đây (không qua prop src) để lần dọn của Strict Mode không làm video mất nguồn; lướt ra xa thì
  // nhả nguồn để ngắt tải segment ngay (xem attachReelVideoSource).
  const hlsUrl = reelCard?.video.hlsUrl;
  // Các mức có sẵn của video (360, 540, 720…), dạng chuỗi để effect gắn nguồn không chạy lại khi thẻ đổi tham chiếu.
  const levelsKey = reelCard?.video.levels.join(',') ?? '';
  // Chờ API đặt cookie video (Set-Cookie cho tên miền media, TF82) rồi mới gắn nguồn; thẻ <video> tự gửi cookie
  // khi tải playlist và segment. Gắn sớm hơn thì CloudFront trả 403 khi đã bật khoá video.
  const { isSettled: isPlaybackSessionSettled, refresh: refreshPlaybackSession } = usePlaybackSession();
  // Số lần đã xin cookie mới vì lỗi 403 cho Reel này; tăng lên là gắn lại nguồn với cookie mới.
  const [authRetryCount, setAuthRetryCount] = useState(0);
  // Hàm của cha đổi mỗi lần render; giữ bản mới nhất trong ref để effect gắn nguồn không chạy lại vì nó.
  const reportMediaError = useRef(() => onMediaError(post.id));
  useEffect(() => {
    reportMediaError.current = () => onMediaError(post.id);
  }, [onMediaError, post.id]);
  // Số giây đệm đổi theo vị trí khi lướt; đọc qua ref lúc gắn để đổi vị trí không gắn lại nguồn (mất bộ đệm).
  const bufferSecondsRef = useRef(bufferSeconds);
  const bufferControlRef = useRef<ReelHlsBufferControl | null>(null);
  useEffect(() => {
    bufferSecondsRef.current = bufferSeconds;
    bufferControlRef.current?.setBufferSeconds(bufferSeconds);
  }, [bufferSeconds]);
  // Đã được phép tải một lần thì giữ nguồn tới khi rời cửa sổ video (bài vừa xem xong vẫn giữ bộ đệm).
  const [isSourceLatched, setSourceLatched] = useState(false);
  const shouldAttachSource = hasVideo && (canLoadSource || isSourceLatched);
  if (shouldAttachSource !== isSourceLatched) setSourceLatched(shouldAttachSource);
  // Nguồn nào đã có hình đầu tiên; đổi nguồn hoặc gỡ nguồn thì không còn khớp nên tự hiện lại vòng chờ.
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const hasFirstFrame = shouldAttachSource && firstFrameUrl === hlsUrl;
  const reportFirstFrame = useRef(() => onFirstFrame(post.id));
  useEffect(() => {
    reportFirstFrame.current = () => onFirstFrame(post.id);
  }, [onFirstFrame, post.id]);
  useEffect(() => {
    const video = localVideoRef.current;
    if (!shouldAttachSource || !video || !hlsUrl || !isPlaybackSessionSettled) return;
    const onLoadedData = () => {
      setFirstFrameUrl(hlsUrl);
      reportFirstFrame.current();
    };
    // loadeddata có thể không bắn lại khi trình duyệt dùng lại dữ liệu đã có, nên nghe thêm canplay, playing.
    const firstFrameEvents = ['loadeddata', 'canplay', 'playing'] as const;
    for (const name of firstFrameEvents) video.addEventListener(name, onLoadedData);
    // Trình duyệt phát HLS sẵn (Chrome, Edge, Safari): thẻ <video>. Firefox máy tính: hls.js gửi kèm cookie (TF64).
    const levels = levelsKey ? levelsKey.split(',').map(Number) : [];
    const release = attachReelHlsSource(video, hlsUrl, {
      // Trình duyệt tự phát: gắn thẳng mức 720p (hoặc nét nhất có), lỗi thì lùi dần, master cuối.
      sources: getReelPlaybackSources({ hlsUrl, levels }, REEL_START_SHORT_SIDE),
      bufferSeconds: bufferSecondsRef.current,
      onBufferControl: (control) => {
        bufferControlRef.current = control;
        control.setBufferSeconds(bufferSecondsRef.current);
      },
      onAuthError: () => {
        // Chỉ xin lại một lần: lỗi tiếp thì không phải do cookie, báo lỗi như thường.
        if (authRetryCount >= 1) {
          reportMediaError.current();
          return;
        }
        void refreshPlaybackSession().then(() => setAuthRetryCount((count) => count + 1));
      },
      onFatalError: () => reportMediaError.current(),
    });
    if (video.readyState >= HAVE_CURRENT_DATA) onLoadedData();
    return () => {
      for (const name of firstFrameEvents) video.removeEventListener(name, onLoadedData);
      bufferControlRef.current = null;
      release();
    };
  }, [shouldAttachSource, hlsUrl, levelsKey, isPlaybackSessionSettled, authRetryCount, refreshPlaybackSession]);


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
              poster={selectReelPoster(reelCard.video.posters, 720)}
              preload="auto"
              playsInline
              loop
              muted={isMuted}
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

          {hasVideo && !hasFirstFrame && (
            <span className={styles.reelLoadingOverlay} aria-hidden="true">
              <span className={styles.reelLoadingSpinner} />
            </span>
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
              <ReelSeekBar videoRef={localVideoRef} onScrubChange={setScrubbing} />
            </>
          )}
        </>
      )}

      {/* Bottom Post Overlay */}
      {/* Đang kéo thanh tua: ẩn tên, chú thích, thẻ lộ trình như TikTok để mốc thời gian nổi rõ. */}
      <div className={styles.stageBottomOverlay} data-hidden={isScrubbing ? true : undefined}>
        <div className={styles.overlayAuthorRow}>
          {/* Avatar cũng mở trang cá nhân như tên; bỏ khỏi thứ tự Tab để không đọc trùng link. */}
          <Link
            prefetch={false}
            className={styles.overlayAvatar}
            href={`/u/${post.authorId}`}
            aria-hidden="true"
            tabIndex={-1}
          >
            {getInitial(authorInfo.name)}
            <AvatarPhoto userId={post.authorId} />
          </Link>
          <div className={styles.overlayAuthorMeta}>
            <div className={styles.overlayAuthorNameRow}>
              <Link prefetch={false} className={styles.profileLink} href={`/u/${post.authorId}`}>
                {authorInfo.name}
              </Link>
              {(post.isVerified || reelCard?.author.isKol) && (
                <SocialIcon name="verified" size={16} />
              )}
            </div>
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
                {/* Tên thẻ là tiêu đề bài (thiếu thì lấy đầu nội dung), không lấy tên khách sạn đầu tiên. */}
                <span className={styles.overlayTripTitle}>
                  {post.title.trim() || getPostTitleFromCaption(post.body ?? '')}
                </span>
                <span className={styles.overlayTripSub}>
                  {[
                    vi.api.immersiveTabSchedule,
                    trip.daysCount
                      ? t('api.postTripDaysBadge', { count: trip.daysCount })
                      : trip.items?.length
                        ? t('api.immersiveStopsCount', { count: trip.items.length })
                        : null,
                    trip.estimatedCostPerPerson
                      ? t('api.postTripApproxCost', { cost: trip.estimatedCostPerPerson.toLocaleString('vi-VN') })
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
  /**
   * Mở từ grid kết quả tìm kiếm: chỉ lướt trong các Reel này (theo thứ tự grid) thay vì bảng tin Reels,
   * bắt đầu ở initialPostId.
   */
  searchReelIds?: string[];
  initialPostId?: string | null;
  /** Có thì hiện nút quay lại grid kết quả. */
  onBackToResults?: () => void;
  /** Mở từ link chia sẻ: Reel này hiện đầu tiên, lướt tiếp là bảng tin Reels. Dùng cùng initialPostId. */
  pinnedPostId?: string | null;
  /** Bình luận cần nhảy tới trong Reel initialPostId (link từ thông báo). */
  focusCommentId?: string;
}

export function InspirationImmersiveViewer({
  onSearchKeywordChange,
  isItineraryOpen: propIsItineraryOpen,
  onToggleItinerary,
  onOpenComposer,
  searchReelIds,
  initialPostId = null,
  onBackToResults,
  pinnedPostId = null,
  focusCommentId,
}: InspirationImmersiveViewerProps) {
  const { isReady, user } = useApiSession();
  const client = useQueryClient();

  const [filterMode] = useState<FeedFilterMode>('all');
  const [activePostId, setActivePostId] = useState<string | null>(initialPostId);

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
  // Bắt đầu null để bài mở sẵn (initialPostId) vẫn được cuộn tới khi danh sách tải xong.
  const lastCommittedPostIdRef = useRef<string | null>(null);
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
  // Bài có video đã chạy (sự kiện playing): tới lúc đó mới tải trước bài thứ 2 phía trước (shouldLoadReelSource).
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  // Bài đã có hình đầu tiên: lướt sang bài chưa có thì chặn một lúc (canStepToNextReel).
  const readyPostIdsRef = useRef(new Set<string>());
  const markReelReady = useCallback((postId: string) => {
    readyPostIdsRef.current.add(postId);
  }, []);
  // Lúc bắt đầu chặn lướt vì bài kế tiếp chưa có hình; đang chặn thì hiện "Đang tải video tiếp theo".
  const nextBlockedSinceRef = useRef<number | null>(null);
  const [isNextBlocked, setNextBlocked] = useState(false);
  // Đã bấm sang bài kế khi đang ở bài cuối và trang sau đang tải: tải xong thì tự sang.
  const isNextPendingRef = useRef(false);
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
  const isSearchReels = searchReelIds !== undefined;
  const [reelsMode, setReelsMode] = useState<PostRecommendationsControllerRecommendReelsMode>('trending');
  const savedFeedQuery = useReelsFeed({ enabled: isReady && !isSearchReels && isSavedMode, isSavedOnly: true });
  const recommendedReelsQuery = useRecommendedReelsFeed({
    enabled: isReady && !isSearchReels && !isSavedMode,
    mode: reelsMode,
  });
  const feedQuery = isSavedMode ? savedFeedQuery : recommendedReelsQuery;
  // Cookie video xin cùng lúc với feed; từng Reel dùng lại kết quả này (cùng query), video đầu không chờ thêm.
  usePlaybackSession();
  const searchReelsQuery = useReelsByIds(searchReelIds ?? [], { enabled: isSearchReels });
  const reelsQuery = isSearchReels ? searchReelsQuery : feedQuery;
  const postsQuery = reelsQuery;
  const pinnedPostIds = useMemo(
    () => (pinnedPostId && !isSearchReels ? [pinnedPostId] : []),
    [pinnedPostId, isSearchReels],
  );
  const pinnedQuery = useReelsByIds(pinnedPostIds, { enabled: pinnedPostIds.length > 0 });
  // Chờ cả Reel ghim để không hiện bảng tin trước rồi mới chèn Reel ghim lên đầu.
  const isReelListPending = postsQuery.isPending || (pinnedPostIds.length > 0 && pinnedQuery.isPending);

  const reelCards = useMemo(
    () =>
      prependPinnedReelCards(
        pinnedQuery.data?.pages.flatMap((page) => page.items) ?? [],
        reelsQuery.data?.pages.flatMap((page) => page.items) ?? [],
      ),
    [pinnedQuery.data, reelsQuery.data],
  );

  const reelMap = useMemo(() => new Map(reelCards.map((card) => [card.postId, card])), [reelCards]);

  // Reels chỉ gồm bài dạng video; bài viết (vlog) không bao giờ hiện ở đây.
  const rawPosts = useMemo<ReelPost[]>(
    () => reelCards.map(toReelPost),
    [reelCards],
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
      // Chỉ tua khi video đã chạy dở (lướt ngược lại): video tải sẵn đang ở đầu, tua về 0 vẫn làm trình duyệt
      // tua thật và tải lại (đo được 1,2–2,8 giây chờ).
      if (videoEl.currentTime > 0.1) videoEl.currentTime = 0;
      attemptPlayVideo();
    }
  }, [activePost?.id, attemptPlayVideo]);

  // Ưu tiên video đang xem: chạy rồi (hoặc chờ quá REEL_PRELOAD_FALLBACK_MS) mới tải trước bài thứ 2 phía trước.
  useEffect(() => {
    const postId = activePost?.id;
    const videoEl = videoRef.current;
    if (!postId) return;
    const markPlaying = () => setPlayingPostId(postId);
    const fallback = setTimeout(markPlaying, REEL_PRELOAD_FALLBACK_MS);
    videoEl?.addEventListener('playing', markPlaying);
    return () => {
      clearTimeout(fallback);
      videoEl?.removeEventListener('playing', markPlaying);
    };
  }, [activePost?.id]);



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

      if (!smooth) {
        isProgrammaticNavRef.current = false;
        scrollTrackToIndex(container, mediaItemRefs.current[clamped], clamped, 'auto');
        commitSettledPost(clamped);
      } else {
        isProgrammaticNavRef.current = true;
        scrollTrackToIndex(container, mediaItemRefs.current[clamped], clamped, 'smooth');

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
          const nextId = posts[nextTarget]?.id ?? '';
          // Bài không có video (đang xử lý) hoặc đã lỗi thì không chờ hình.
          // Đọc thêm readyState của thẻ video phòng khi sự kiện loadeddata tới sau lúc người xem lướt.
          const nextVideo = mediaItemRefs.current[nextTarget]?.querySelector('video');
          const isNextReady =
            readyPostIdsRef.current.has(nextId) ||
            (nextVideo?.readyState ?? 0) >= HAVE_CURRENT_DATA ||
            !reelMap.get(nextId)?.video ||
            mediaErrorPostId === nextId;
          if (!canStepToNextReel({ isNextReady, blockedSinceMs: nextBlockedSinceRef.current, nowMs: now })) {
            nextBlockedSinceRef.current ??= now;
            setNextBlocked(true);
            return;
          }
          nextBlockedSinceRef.current = null;
          setNextBlocked(false);
          navCooldownRef.current = now + 450;
          goToIndex(nextTarget, true);
        } else if (postsQuery.hasNextPage) {
          // Hết bài đã tải: đứng yên như lúc hết video, hiện vòng chờ, trang sau về thì tự sang.
          isNextPendingRef.current = true;
          navCooldownRef.current = now + 450;
          if (!postsQuery.isFetchingNextPage) void postsQuery.fetchNextPage();
        }
      } else {
        if (nextTarget >= 0) {
          navCooldownRef.current = now + 450;
          goToIndex(nextTarget, true);
        }
      }
    },
    [posts, postsQuery, goToIndex, reelMap, mediaErrorPostId],
  );

  // Đang chặn vì bài kế tiếp chưa có hình: có hình rồi thì bỏ thông báo chờ (lướt lại là sang được).
  useEffect(() => {
    if (!isNextBlocked) return;
    const nextIndex = targetIndexRef.current + 1;
    const nextId = posts[nextIndex]?.id;
    const timer = setInterval(() => {
      const nextVideo = mediaItemRefs.current[nextIndex]?.querySelector('video');
      const isReady = !nextId || readyPostIdsRef.current.has(nextId) || (nextVideo?.readyState ?? 0) >= HAVE_CURRENT_DATA;
      if (!isReady) return;
      clearInterval(timer);
      nextBlockedSinceRef.current = null;
      setNextBlocked(false);
    }, 200);
    return () => clearInterval(timer);
  }, [isNextBlocked, posts]);

  // Đã bấm sang bài kế ở bài cuối: trang sau về thì tự sang bài mới.
  useEffect(() => {
    if (!isNextPendingRef.current || activeIndex < 0 || activeIndex >= posts.length - 1) return;
    isNextPendingRef.current = false;
    goToIndex(activeIndex + 1, true);
  }, [posts.length, activeIndex, goToIndex]);

  const isLoadingMoreReels = activeIndex >= posts.length - 1 && postsQuery.isFetchingNextPage;

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
      scrollTrackToIndex(trackScrollRef.current, mediaItemRefs.current[targetIdx], targetIdx, 'auto');
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
      // Bỏ qua khi đang gõ chữ; thanh tua (input range) thì ↑ / ↓ vẫn chuyển bài.
      const isTyping =
        target &&
        ((target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) {
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
      // Menu chia sẻ đã lo link và kênh; tới đây là người dùng đã chia sẻ thật, chỉ ghi nhận lượt.
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

  const hasItinerary = hasTripPlan(trip); // Như app: chỉ có điểm đến mà không có lịch từng ngày hay chỗ ở thì không hiện thẻ lịch trình.
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

  const shareMenuRef = useRef<ShareMenuHandle | null>(null);

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
        onShare={(anchor) =>
          shareMenuRef.current?.toggle(anchor, { postId: post.id, postType: post.postType, title: post.title })
        }
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
    return <output className="empty-state"><LoadingDots /></output>;
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
            postId={activePost?.id}
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
            {onBackToResults && (
              <button type="button" className={styles.searchBackPill} onClick={onBackToResults}>
                <SocialIcon name="chevronLeft" size={16} />
                {vi.api.searchResultsBack}
              </button>
            )}
            {!isSearchReels && !isSavedMode && (
              <div
                role="tablist"
                aria-label={vi.api.recommendModeAria}
                style={{
                  position: 'absolute',
                  top: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 25,
                  display: 'flex',
                  gap: 6,
                  // Màn hẹp (375px) 4 chip rộng hơn khung: giữ trong khung và cuộn ngang thay vì tràn hai mép.
                  maxWidth: 'calc(100% - 24px)',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  padding: '4px 6px',
                  borderRadius: 999,
                  background: 'rgba(15, 23, 42, 0.55)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {(
                  [
                    { value: 'trending', label: vi.api.recommendModeTrending },
                    { value: 'for_you', label: vi.api.recommendModeForYou },
                    { value: 'has_plan', label: vi.api.recommendModeHasPlan },
                    { value: 'recent', label: vi.api.recommendModeRecent },
                  ] as const
                ).map((option) => {
                  const selected = option.value === reelsMode;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setReelsMode(option.value)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: selected ? '#ffffff' : 'transparent',
                        color: selected ? '#0f172a' : '#f8fafc',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
            {filterMode === 'saved' && !user ? (
              <div className={`empty-state ${styles.centerEmptyBox}`}>
                <p>{vi.api.loginRequired}</p>
                <Link prefetch={false} href={loginReturnHref} className={styles.createPostBtn}>
                  {vi.api.login}
                </Link>
              </div>
            ) : isReelListPending ? (
              <output className="empty-state"><LoadingDots /></output>
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
                  // Đang chờ bài kế tiếp hoặc trang sau: khung video trượt lên, lộ dải dưới có vòng chờ (như TikTok).
                  data-next-loading={isLoadingMoreReels || isNextBlocked ? true : undefined}
                >
                  {/* Top-Left Volume + Slider & Top-Right Hover Controls (More / Fullscreen) */}
                  <>
                    {reelCard?.video && activePost.postType === 'video' && !isMediaError && (
                      <div
                        className={`${styles.stageTopLeftControls} ${onBackToResults ? styles.stageTopLeftControlsBelowBack : ''}`}
                      >
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

                    {activePost && (
                      <div className={styles.stageTopControls}>
                        <PostOptionsMenu key={activePost.id} post={activePost} isSaved={getReelEngagement(activePost).isSaved}
                          onToggleSave={() => { if (!user) { window.location.href = loginReturnHref; return; } engagementMutation.mutate({ postId: activePost.id, type: 'save', nextSelected: !getReelEngagement(activePost).isSaved }); }} buttonClassName={styles.stageCircleBtn} />
                      </div>
                    )}
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
                          >
                            {Math.abs(idx - activeIndex) <= REEL_PLACEHOLDER_SPINNER_RANGE && (
                              <span className={styles.reelLoadingSpinner} />
                            )}
                          </div>
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
                          canLoadSource={shouldLoadReelSource(idx, activeIndex, playingPostId === activePost?.id)}
                          onFirstFrame={markReelReady}
                          bufferSeconds={getReelBufferSeconds(idx, activeIndex)}
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
                  {(isLoadingMoreReels || isNextBlocked) && (
                    <output className={styles.reelMoreLoading}>
                      <span className={styles.reelLoadingSpinnerSmall} aria-hidden="true" />
                      {isLoadingMoreReels ? vi.api.reelLoadingMore : vi.api.reelLoadingNext}
                    </output>
                  )}
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
                      disabled={activeIndex <= 0}
                      onClick={() => navigateStep(-1)}
                    >
                      <SocialIcon name="arrowUp" size={20} />
                    </button>
                    <button
                      type="button"
                      className={styles.navArrowBtn}
                      aria-label={vi.api.immersiveNextPost}
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
                  data-tooltip={vi.api.commentPanelClose}
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
                focusCommentId={activePost.id === initialPostId ? focusCommentId : undefined}
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

      <ShareMenu
        ref={shareMenuRef}
        side="left"
        onShared={(postId) => engagementMutation.mutate({ postId, type: 'share' })}
      />
    </div>
  );
}

interface CommentDraft {
  body: string;
  replyTarget: { id: string; authorName: string } | null;
  mentions?: CommentMention[];
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
    if (draft && (draft.body.trim() || draft.replyTarget || (draft.mentions && draft.mentions.length > 0))) {
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
  focusCommentId,
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
  /** Bình luận mở từ thông báo: đưa luồng của nó lên đầu, mở sẵn trả lời, cuộn tới và tô sáng. */
  focusCommentId?: string;
}) {
  const { user, isReady, session } = useApiSession();
  const permissions = useCommentPermissions(post.id);
  const client = useQueryClient();
  const initialDraft = getCommentDraft(post.id);
  const [pendingComments, setPendingComments] = useState<readonly PostCommentsChange[]>([]);
  useEffect(() => watchPostComments(post.id, (changes) => {
    const pending = changes.filter((change) => change.kind === 'created' && !change.parentCommentId &&
      (scrollContainerRef.current?.scrollTop ?? 0) > 48);
    if (pending.length) {
      shiftPostCommentCount(client, post.id, pending.length);
      setPendingComments((current) => [...current.filter((change) => change.postId === post.id), ...pending]);
    }
    const immediate = changes.filter((change) => !pending.includes(change));
    if (immediate.length) void reloadPostComments(client, post.id, immediate);
  }), [client, post.id, user?.id, scrollContainerRef]);
  const pendingForPost = pendingComments.filter((change) => change.postId === post.id);
  const [body, setBody] = useState(initialDraft?.body ?? '');
  const [mentions, setMentions] = useState<CommentMention[]>(initialDraft?.mentions ?? []);
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [isEmojiOpen, setEmojiOpen] = useState(false);
  // Cả viên thuốc nhập (ô chữ và nút emoji) tính là bên trong bảng emoji: bấm vào để gõ không đóng bảng.
  const composerFieldRef = useRef<HTMLDivElement | null>(null);
  const closeEmojiPicker = useCallback(() => setEmojiOpen(false), []);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(
    initialDraft?.replyTarget ?? null,
  );

  const handleBodyChange = (value: string) => {
    const cursor = composerInputRef.current?.selectionStart ?? value.length;
    const nextMentions = updateMentionsOnTextChange(body, value, mentions, cursor);
    setMentions(nextMentions);
    setBody(value);
    saveCommentDraft(post.id, { body: value, replyTarget, mentions: nextMentions });

    const query = getMentionQueryAtCursor(value, cursor, nextMentions);
    setMentionQuery(query);
    if (query) setEmojiOpen(false);
  };

  /** Chèn emoji đúng chỗ con trỏ rồi trả focus về ô nhập để gõ tiếp. */
  const handleInsertEmoji = (emoji: string) => {
    const input = composerInputRef.current;
    const next = insertAtSelection(body, input?.selectionStart ?? null, input?.selectionEnd ?? null, emoji);
    const cursor = next.caret;
    const nextMentions = updateMentionsOnTextChange(body, next.value, mentions, cursor);
    setMentions(nextMentions);
    setBody(next.value);
    saveCommentDraft(post.id, { body: next.value, replyTarget, mentions: nextMentions });
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleSelectMention = (selectedUser: MentionUserItem) => {
    const input = composerInputRef.current;
    const cursor = input?.selectionStart ?? body.length;
    const result = insertMentionTag(body, cursor, selectedUser, mentions);
    setBody(result.newText);
    setMentions(result.newMentions);
    saveCommentDraft(post.id, { body: result.newText, replyTarget, mentions: result.newMentions });
    setMentionQuery(null);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(result.newCursor, result.newCursor);
    });
  };

  const handleReplySelect = (target: { id: string; authorName: string } | null) => {
    setReplyTarget(target);
    saveCommentDraft(post.id, { body, replyTarget: target, mentions });
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
        return await createCommentWithMentions({
          postId: post.id,
          body: body.trim(),
          parentCommentId: replyTarget?.id,
          mentions,
        });
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
          Boolean(errObj?.message?.includes('email_unverified'));
        if (isUnverified && session) {
          try {
            await session.refreshUser();
            return await createCommentWithMentions({
              postId: post.id,
              body: body.trim(),
              parentCommentId: replyTarget?.id,
              mentions,
            });
          } catch {
            throw error;
          }
        }
        throw error;
      }
    },
    onSuccess: (createdComment) => {
      saveCommentDraft(post.id, null);
      setBody('');
      setMentions([]);
      setMentionQuery(null);
      setReplyTarget(null);
      if (createdComment) addCommentToCache(client, createdComment);
    },
  });

  const focusedThread = useQuery({
    queryKey: ['social', 'comment-thread', post.id, focusCommentId, user?.id],
    enabled: !!focusCommentId,
    queryFn: ({ signal }) => socialApi.getCommentThread(post.id, focusCommentId!, signal),
  });
  const focusTarget = focusedThread.data?.items.find((comment) => comment.id === focusCommentId);
  const focusRoot = focusTarget?.parentCommentId
    ? focusedThread.data?.items.find((comment) => comment.id === focusTarget.parentCommentId)
    : focusTarget;
  const focusedReply = focusTarget?.parentCommentId ? focusTarget : undefined;

  const loadedComments = query.data?.pages.flatMap((page) => page.items) ?? [];
  const comments = focusRoot && !loadedComments.some((comment) => comment.id === focusRoot.id)
    ? [focusRoot, ...loadedComments]
    : loadedComments;

  return (
    <>
      <div
        ref={scrollContainerRef}
        className={styles.rightScrollArea}
      >
        {permissions.data?.canManage && <CreatorCommentControls postId={post.id} />}
        {pendingForPost.length > 0 && (
          <button type="button" aria-live="polite" className={styles.utilityBtn}
            style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface)' }} onClick={() => {
            const changes = pendingForPost;
            setPendingComments([]);
            scrollContainerRef.current?.scrollTo({ top: 0 });
            void reloadPostComments(client, post.id, changes.map((change) => ({ ...change, kind: 'updated' })));
          }}>
            {t('api.newComments', { count: pendingForPost.length })}
          </button>
        )}
        {showSummary && <ReelCommentSummary key={post.id} postId={post.id} />}
        <ApiErrorNotice error={addMutation.error} />
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {focusCommentId && (
          <>
            <ApiErrorNotice error={focusedThread.error} retry={() => void focusedThread.refetch()} />
            {focusedThread.isSuccess && !focusTarget && <output>{vi.api.commentUnavailable}</output>}
          </>
        )}
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
              focusCommentId={focusCommentId}
              focusedReply={focusedReply?.parentCommentId === comment.id ? focusedReply : undefined}
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
        {permissions.data?.enabled === false ? <p role="status" className="small muted">{vi.moderation.commentsDisabled}</p> : user ? (
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
                <AvatarPhoto src={user.avatarUrl} />
              </span>
              {user.emailVerified && (
                <span className={styles.composerVerifiedBadge} data-tooltip="Tài khoản đã xác thực">
                  <SocialIcon name="verified" size={11} />
                  <span className={styles.srOnly}>Tài khoản đã xác thực</span>
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
                onKeyUp={() => {
                  const cursor = composerInputRef.current?.selectionStart ?? body.length;
                  const query = getMentionQueryAtCursor(body, cursor, mentions);
                  setMentionQuery(query);
                }}
                onClick={() => {
                  const cursor = composerInputRef.current?.selectionStart ?? body.length;
                  const query = getMentionQueryAtCursor(body, cursor, mentions);
                  setMentionQuery(query);
                }}
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
                  setMentionQuery(null);
                  composerInputRef.current?.focus();
                }}
              >
                <SocialIcon name="smile" size={20} />
              </button>
              {isEmojiOpen && (
                <EmojiPicker keepOpenRef={composerFieldRef} onSelect={handleInsertEmoji} onClose={closeEmojiPicker} />
              )}
              {mentionQuery && (
                <MentionPicker
                  query={mentionQuery.query}
                  keepOpenRef={composerFieldRef}
                  onSelect={handleSelectMention}
                  onClose={() => setMentionQuery(null)}
                />
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
  focusCommentId,
  focusedReply,
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
    replyToName?: string | null;
    moderationState?: 'hidden' | null;
    status?: SocialCommentDto['status'];
    creatorReview?: SocialCommentDto['creatorReview'];
    mentions?: CommentMention[];
  };
  isReply?: boolean;
  loginHref: string;
  onReplySelect: (target: { id: string; authorName: string }) => void;
  focusCommentId?: string;
  /** Trả lời được nhắc tới trong thông báo: luôn hiện dù chưa nằm trong trang trả lời đã tải. */
  focusedReply?: SocialCommentDto;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [showRepliesChoice, setShowReplies] = useState<boolean | null>(null);
  const showReplies = showRepliesChoice ?? Boolean(focusedReply);
  const isFocused = comment.id === focusCommentId;
  const focusRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (isFocused) focusRef.current?.scrollIntoView({ block: 'center' });
  }, [isFocused]);
  const [isEditing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editMentions, setEditMentions] = useState<CommentMention[]>(comment.mentions ?? []);
  const [editMentionQuery, setEditMentionQuery] = useState<MentionQuery | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editFieldRef = useRef<HTMLDivElement | null>(null);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const handleEditBodyChange = (value: string) => {
    const cursor = editTextareaRef.current?.selectionStart ?? value.length;
    const nextMentions = updateMentionsOnTextChange(editBody, value, editMentions, cursor);
    setEditMentions(nextMentions);
    setEditBody(value);

    const query = getMentionQueryAtCursor(value, cursor, nextMentions);
    setEditMentionQuery(query);
  };

  const handleSelectEditMention = (selectedUser: MentionUserItem) => {
    const textarea = editTextareaRef.current;
    const cursor = textarea?.selectionStart ?? editBody.length;
    const result = insertMentionTag(editBody, cursor, selectedUser, editMentions);
    setEditBody(result.newText);
    setEditMentions(result.newMentions);
    setEditMentionQuery(null);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.newCursor, result.newCursor);
    });
  };

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
    onSuccess: (reaction) => {
      setCommentReactionInCache(client, postId, reaction);
    },
    onSettled: () => {
      setOptimisticLiked(null);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (action: 'edit' | 'delete') => {
      if (action === 'delete') return socialApi.deleteComment(comment.id);
      return editCommentWithMentions({
        commentId: comment.id,
        body: editBody.trim(),
        mentions: editMentions,
      });
    },
    onSuccess: (updatedComment, action) => {
      if (action === 'delete') {
        removeCommentFromCache(client, postId, comment.id);
        return;
      }
      setEditing(false);
      setEditMentionQuery(null);
      replaceCommentInCache(client, updatedComment as SocialCommentDto);
    },
  });

  const loadedReplies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const replies = focusedReply && !loadedReplies.some((reply) => reply.id === focusedReply.id)
    ? [focusedReply, ...loadedReplies]
    : loadedReplies;
  const totalReplies = (comment as { replyCount?: number }).replyCount ?? repliesQuery.data?.pages[0]?.total ?? replies.length;

  if (comment.moderationState === 'hidden') {
    return (
      <li ref={focusRef} id={`comment-${comment.id}`} className={styles.panelCommentItem}>
        <ModeratedComment />
        <ApiErrorNotice error={commentMutation.error} />
        {isMine && (
          <button type="button" className={styles.panelCommentActionBtn}
            disabled={commentMutation.isPending} onClick={() => commentMutation.mutate('delete')}>
            {vi.api.remove}
          </button>
        )}
      </li>
    );
  }

  if (comment.status === 'held') return (
    <li ref={focusRef} id={`comment-${comment.id}`} className={styles.panelCommentItem}>
      <strong>{authorDisplay.name} · {vi.moderation.heldTitle}</strong>
      <p className={styles.panelCommentText}>
        {parseCommentSegments(comment.body, comment.mentions).map((segment, index) =>
          segment.type === 'mention' && segment.userId ? (
            <Link
              key={index}
              prefetch={false}
              href={`/u/${segment.userId}`}
              className={styles.commentMentionLink}
            >
              {segment.text}
            </Link>
          ) : (
            <Fragment key={index}>{segment.text}</Fragment>
          ),
        )}
      </p>
      <p className="small muted">{comment.creatorReview === 'pending' ? vi.moderation.creatorHeld : comment.creatorReview === 'rejected' ? vi.moderation.creatorRejected : vi.moderation.heldComment}</p>
      <ApiErrorNotice error={commentMutation.error} />
      {isMine && <button type="button" className={styles.panelCommentActionBtn} disabled={commentMutation.isPending} onClick={() => commentMutation.mutate('delete')}>{vi.api.remove}</button>}
    </li>
  );

  return (
    <li
      ref={focusRef}
      id={`comment-${comment.id}`}
      className={`${styles.panelCommentItem} ${isFocused ? styles.panelCommentFocused : ''}`}
    >
      <CommentVisibility commentId={comment.id} isMine={isMine} loginHref={loginHref} className={styles.panelCommentRow}>
        <Link
          prefetch={false}
          className={styles.avatarSmall}
          data-tone={getAvatarTone(authorDisplay.name)}
          href={`/u/${comment.authorId}`}
          aria-hidden="true"
          tabIndex={-1}
        >
          {getInitial(authorDisplay.name)}
          <AvatarPhoto userId={comment.authorId} />
        </Link>
        <div className={styles.panelCommentContent}>
          <div className={styles.panelCommentMeta}>
            <span className={styles.panelCommentAuthor}>
              <Link prefetch={false} className={styles.profileLink} href={`/u/${comment.authorId}`}>
                {authorDisplay.name}
              </Link>
              {comment.replyToName && ` ↳ ${comment.replyToName}`}
            </span>
            {isAuthorVerified && (
              <span className={styles.commentVerifiedIcon} data-tooltip="Tài khoản đã xác minh">
                <SocialIcon name="verified" size={13} />
                <span className={styles.srOnly}>Tài khoản đã xác minh</span>
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
              <div ref={editFieldRef} style={{ position: 'relative' }}>
                <textarea
                  ref={editTextareaRef}
                  className={styles.composerTextarea}
                  aria-label={vi.api.edit}
                  rows={2}
                  value={editBody}
                  onChange={(event) => handleEditBodyChange(event.target.value)}
                  onKeyUp={() => {
                    const cursor = editTextareaRef.current?.selectionStart ?? editBody.length;
                    const query = getMentionQueryAtCursor(editBody, cursor, editMentions);
                    setEditMentionQuery(query);
                  }}
                  onClick={() => {
                    const cursor = editTextareaRef.current?.selectionStart ?? editBody.length;
                    const query = getMentionQueryAtCursor(editBody, cursor, editMentions);
                    setEditMentionQuery(query);
                  }}
                />
                {editMentionQuery && (
                  <MentionPicker
                    query={editMentionQuery.query}
                    keepOpenRef={editFieldRef}
                    onSelect={handleSelectEditMention}
                    onClose={() => setEditMentionQuery(null)}
                  />
                )}
              </div>
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
                  onClick={() => {
                    setEditing(false);
                    setEditMentionQuery(null);
                    setEditBody(comment.body);
                    setEditMentions(comment.mentions ?? []);
                  }}
                >
                  {vi.api.cancel}
                </button>
              </div>
            </form>
          ) : (
            <p className={styles.panelCommentText}>
              {parseCommentSegments(comment.body, comment.mentions).map((segment, index) =>
                segment.type === 'mention' && segment.userId ? (
                  <Link
                    key={index}
                    prefetch={false}
                    href={`/u/${segment.userId}`}
                    className={styles.commentMentionLink}
                  >
                    {segment.text}
                  </Link>
                ) : (
                  <Fragment key={index}>{segment.text}</Fragment>
                ),
              )}
            </p>
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

              <>
                  <button
                    type="button"
                    className={styles.panelCommentActionBtn}
                    onClick={() => {
                      if (!isReply) setShowReplies(true);
                      onReplySelect({ id: comment.id, authorName: authorDisplay.name });
                    }}
                  >
                    {vi.api.commentReplyAction}
                  </button>
                  {!isReply && totalReplies > 0 && (
                    <button
                      type="button"
                      className={styles.panelCommentActionBtn}
                      aria-expanded={showReplies}
                      onClick={() => setShowReplies(!showReplies)}
                    >
                      {showReplies
                        ? vi.api.commentHideReplies
                        : `${vi.api.commentViewReplies} (${totalReplies})`}
                    </button>
                  )}
              </>

              {isMine && (
                <>
                  <button
                    type="button"
                    className={styles.panelCommentActionBtn}
                    disabled={commentMutation.isPending}
                    onClick={() => {
                      setEditBody(comment.body);
                      setEditMentions(comment.mentions ?? []);
                      setEditMentionQuery(null);
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
                    focusCommentId={focusCommentId}
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
      </CommentVisibility>
    </li>
  );
}

export interface ComposerModalProps {
  onClose: () => void;
  initialView?: 'compose' | 'drafts';
  initialDraftId?: string | null;
  initialPostType?: 'video' | 'vlog';
}

/** Modal tạo và quản lý bài đăng / bản nháp */
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Công khai với mọi người' },
  { value: 'private', label: 'Chỉ mình tôi' },
];

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
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
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
  // Ảnh của bài viết (vlog): chọn là tải lên ngay, lúc lưu chỉ gửi danh sách id theo thứ tự.
  const postImages = usePostImages();
  const { reset: resetPostImages } = postImages;

  // Lịch trình chuyến đi (Trip Attachment)
  const [enableItinerary, setEnableItinerary] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripPlanDraft>(createTripPlanDraft);

  // Nạp dữ liệu bản nháp vào form để tiếp tục sửa
  const handleLoadDraft = useCallback((draft: SocialPostDto) => {
    setEditingDraftId(draft.id);
    setTitle(draft.title || '');
    setBody(draft.body || '');
    setPostType(draft.postType === 'video' ? 'video' : 'vlog');
    setHashtags(parseStoredHashtags(draft.hashtags));
    setVisibility((draft.visibility as 'public' | 'private') || 'public');
    // mediaIds của bài viết là ảnh, của Reels là video.
    setExistingMediaId(draft.postType === 'video' ? draft.mediaIds?.[0] || null : null);
    resetPostImages(draft.postType === 'vlog' ? (draft.images ?? []) : []);
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
      setTripDraft(buildTripDraftFromAttachment(draft.tripAttachment, vi.mobile.tripPlan.modes));
    } else {
      setEnableItinerary(false);
      setTripDraft(createTripPlanDraft());
    }

    setViewMode('compose');
  }, [resetPostImages]);

  const handleNewPost = () => {
    setEditingDraftId(null);
    setTitle('');
    setBody('');
    setHashtags([]);
    setPostType(initialPostType);
    setVisibility('public');
    setExistingMediaId(null);
    resetPostImages();
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
    setTripDraft(createTripPlanDraft());
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

      setUploadStepText(vi.api.composerVideoUploadPart);

      const { etag } = await uploadChunkToPresignedUrl(part.url, chunk, undefined, (sentBytes) =>
        setUploadProgress(calculateUploadPercent(start + sentBytes, file.size)),
      );

      uploadedParts.push({
        partNumber: part.partNumber,
        etag: etag || `"${part.partNumber}"`,
      });

      setUploadProgress(calculateUploadPercent(end, file.size));
    }

    setUploadStepText(vi.api.composerVideoProcessing);
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

      if (postType === 'vlog' && postImages.isUploading) {
        throw new Error(vi.api.composerImageWaitUpload);
      }
      if (postType === 'vlog' && postImages.hasFailed) {
        throw new Error(vi.api.composerImageFixFailed);
      }
      // Bài viết luôn gửi đủ danh sách ảnh (kể cả rỗng) để xoá hết ảnh cũng lưu được.
      const imageMedia =
        postType === 'vlog'
          ? {
              media_ids: postImages.imageIds,
              ...(postImages.imageIds[0] ? { cover_media_id: postImages.imageIds[0] } : {}),
            }
          : {};

      let uploadedAssetId: string | undefined = postType === 'video' ? existingMediaId || undefined : undefined;
      if (postType === 'video' && videoFile && videoDuration) {
        uploadedAssetId = await uploadVideoMultipart(videoFile, videoDuration);
        setExistingMediaId(uploadedAssetId);
      }

      const parsedTags = hashtags;

      let tripAttachment: TripAttachmentDto | undefined = undefined;
      if (enableItinerary) {
        tripAttachment = buildTripAttachment(tripDraft, vi.mobile.tripPlan.modes) ?? undefined;
      }

      let currentId = editingDraftId;
      let savedStatus: string = 'draft';

      if (currentId) {
        const patchPayload: UpdatePostDto = {
          title: title.trim() || 'Bản nháp',
          body: body.trim(),
          hashtags: parsedTags,
          visibility,
          ...(uploadedAssetId ? { media_ids: [uploadedAssetId], cover_media_id: uploadedAssetId } : {}),
          ...imageMedia,
          ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
        };
        savedStatus = (await socialApi.updatePost(currentId, patchPayload)).status;
      } else {
        const draftPayload = {
          post_type: postType,
          title: title.trim() || 'Bản nháp',
          body: body.trim(),
          hashtags: parsedTags,
          visibility,
          ...(uploadedAssetId ? { media_ids: [uploadedAssetId], cover_media_id: uploadedAssetId } : {}),
          ...imageMedia,
          ...(tripAttachment ? { trip_attachment: tripAttachment } : {}),
        };
        const draft = await socialApi.createDraft(draftPayload);
        currentId = draft.id;
        setEditingDraftId(draft.id);
      }

      const publication = shouldPublish && currentId && savedStatus === 'draft' ? await socialApi.publishPost(currentId) : null;
      return { id: currentId, published: shouldPublish, postType, status: publication?.status ?? savedStatus };
    },
    onSuccess: async (data) => {
      await client.invalidateQueries({ queryKey: ['social'] });
      if (data.published && data.id) {
        // Feed gợi ý giữ nguyên trang đã tải khi làm mới: chèn bài vừa đăng lên đầu để thấy ngay, không phải F5.
        const detail = await socialApi.getPost(data.id).catch(() => null);
        if (detail) addPublishedPostToFeeds(client, detail.post);
        if (data.postType === 'video') void client.invalidateQueries({ queryKey: ['feed'] });
        publishNoticeStore.show(data.id, data.postType, data.status === 'held' ? 'held' : 'published');
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
            <div className={styles.draftsHeaderTitle}>
              <button
                type="button"
                className={styles.iconGhostBtn}
                aria-label="Quay lại soạn thảo"
                data-tooltip="Quay lại soạn thảo"
                onClick={() => setViewMode('compose')}
              >
                <SocialIcon name="chevronLeft" size={18} />
              </button>
              <h3 className={styles.panelHeaderTitle}>Bản nháp</h3>
              {draftsCount > 0 && <span className={styles.draftsCount}>{draftsCount}</span>}
            </div>
            <div className={styles.composerHeaderActions}>
              {drafts.length > 0 && (
                <button type="button" className={styles.draftsNewBtn} onClick={handleNewPost}>
                  <SocialIcon name="plus" size={14} />
                  <span>Viết bài mới</span>
                </button>
              )}
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
                <output><LoadingDots label="Đang tải danh sách bản nháp..." /></output>
              </div>
            ) : drafts.length === 0 ? (
              <div className={styles.draftEmptyState}>
                <span className={styles.draftEmptyIcon}>
                  <SocialIcon name="bookmark" size={22} />
                </span>
                <p className={styles.draftEmptyTitle}>Chưa có bản nháp</p>
                <p className={styles.draftEmptyHint}>Khi soạn bài, bấm “Lưu bản nháp” để viết tiếp sau.</p>
                <button type="button" className={styles.draftsNewBtn} onClick={handleNewPost}>
                  <SocialIcon name="plus" size={14} />
                  <span>Viết bài mới</span>
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

                  <p className={styles.draftMeta}>
                    {[
                      draft.postType === 'video' ? 'Reels' : 'Bài viết',
                      draft.tripAttachment?.destinationName,
                      `Sửa ${new Date(draft.updatedAt || draft.createdAt).toLocaleDateString('vi-VN')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

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
          <h3 className={styles.panelHeaderTitle}>
            {editingDraftId ? 'Sửa bản nháp' : vi.api.feedCreatePostCta}
          </h3>
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
            <HashtagInput tags={hashtags} onChange={setHashtags} isDisabled={isFormBusy} />

            <SoftSelect
              className={styles.composerSelect}
              value={visibility}
              options={VISIBILITY_OPTIONS}
              onChange={(value) => setVisibility(value === 'private' ? 'private' : 'public')}
              aria-label="Quyền riêng tư"
              disabled={isFormBusy}
            />
          </div>
        </div>

        {/* 3a. Ảnh: chỉ bài viết (vlog) kèm ảnh; Reels kèm video ở khu bên dưới */}
        {postType === 'vlog' && (
          <div className={styles.composerSection}>
            <div className={styles.composerSectionHeader}>
              <h4 className={styles.composerSectionTitle}>
                <SocialIcon name="upload" size={16} />
                <span>{vi.api.composerImagesTitle}</span>
              </h4>
            </div>
            <PostImagePicker images={postImages} isDisabled={isFormBusy} />
          </div>
        )}

        {/* 3. Video Reels: bài viết (vlog) không được kèm video nên chỉ hiện khi chọn Reels */}
        {postType === 'video' && (
        <div className={styles.composerSection}>
          <div className={styles.composerSectionHeader}>
            <h4 className={styles.composerSectionTitle}>
              <SocialIcon name="video" size={16} />
              <span>Video Reels</span>
            </h4>
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
              data-drag-over={isVideoDragOver || undefined}
              disabled={isFormBusy}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsVideoDragOver(true);
              }}
              onDragLeave={() => setIsVideoDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsVideoDragOver(false);
                const dropped = pickDroppedVideo(event.dataTransfer.files);
                if ('file' in dropped) void handleSelectFile(dropped.file);
                else if (dropped.error === 'type') setUploadError(vi.api.composerVideoInvalidType);
              }}
            >
              <span className={styles.composerDropzoneIcon}>
                <SocialIcon name="upload" size={20} />
              </span>
              <span className={styles.composerDropzoneText}>
                {isVideoDragOver ? vi.api.composerVideoDropActive : vi.api.composerVideoDropHint}
              </span>
              <span className={styles.composerDropzoneHint}>{vi.api.composerVideoFormatHint}</span>
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
                    data-tooltip="Xóa video đã chọn"
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
                  <div
                    className={styles.composerProgressBarBg}
                    aria-hidden="true"
                    data-finishing={uploadProgress >= 90 && uploadProgress < 100 ? true : undefined}
                  >
                    <div
                      className={styles.composerProgressBarFill}
                      style={{ transform: `scaleX(${uploadProgress / 100})` }}
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
            <ComposerTripPlanEditor draft={tripDraft} onChange={setTripDraft} disabled={isFormBusy} />
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
              ? <LoadingDots label="Đang tải video..." />
              : saveMutation.isPending && saveMutation.variables?.shouldPublish
                ? vi.api.saving
                : 'Đăng bài viết'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
