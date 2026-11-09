'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  evictPostFromCache,
  HttpError,
  isPostNotFoundError,
  socialApi,
  updateReelSocialCache,
  useApiSession,
  useReelsFeed,
  useSocialPosts,
} from '@tripflix/api-client';
import { commentsControllerSetCommentReaction } from '@tripflix/api-client/core-api/social-comments/social-comments';
import { selectReelPoster } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getInitial } from '@/features/auth/account-helpers';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getPostCover, getPostImages, POST_COVER_MASCOT } from './post-cover';
import styles from './live-posts.module.css';

// Trang chi tiết bài viết nằm ở post-detail.tsx; giữ export ở đây để app/trips/[slug]/page.tsx không phải đổi.
export { LivePostDetail } from './post-detail';

type FeedFilterMode = 'all' | 'withTrip' | 'saved';
type ItineraryTab = 'schedule' | 'destinations' | 'cost';

type SocialIconName =
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
  | 'sun'
  | 'moon'
  | 'plus';

/** Bộ icon vector đồng nhất nét 1.85px theo chuẩn Instagram / Threads / Lucide. */
function SocialIcon({ name, size = 18 }: { name: SocialIconName; size?: number }) {
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
  }
}

function formatAuthorDisplay(
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

function formatDateVi(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatCompactCount(value: number): string {
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
  return <InspirationImmersiveViewer initialKeyword={keyword} />;
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
  if (!user) return <Link href="/login">{vi.api.loginRequired}</Link>;
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
                  <Link href={`/trips/${post.id}`}>{post.title}</Link>
                </h3>
                <p className={styles.postBodyClamped}>{post.body}</p>
                <p className="small muted">
                  {post.reactionTotal} {vi.api.like} · {post.commentCount} {vi.api.comments}
                </p>
                <Link href={`/trips/${post.id}`} className="secondary-button">
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
function InspirationImmersiveViewer({ initialKeyword = '' }: { initialKeyword?: string }) {
  const { isReady, user } = useApiSession();
  const client = useQueryClient();

  const [filterMode, setFilterMode] = useState<FeedFilterMode>('all');
  const [searchInput, setSearchInput] = useState<string>(initialKeyword);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const [isLeftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<ItineraryTab>('schedule');
  const [isRightOpen, setRightOpen] = useState(true);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isComposerModalOpen, setComposerModalOpen] = useState(false);

  // Media player session states
  const [isMuted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setPlaying] = useState(true);
  const [showPlayFlash, setShowPlayFlash] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [mediaErrorPostId, setMediaErrorPostId] = useState<string | null>(null);
  const [captionExpandedPostId, setCaptionExpandedPostId] = useState<string | null>(null);
  const [galleryState, setGalleryState] = useState<{ postId: string; index: number } | null>(null);
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, 'portrait' | 'landscape' | 'square'>
  >({});

  // Optimistic states per postId
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  const [optimisticSaves, setOptimisticSaves] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelLockUntilRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);

  const queryKind = filterMode === 'saved' ? 'bookmarks' : 'public';
  const postsQuery = useSocialPosts(queryKind, filterMode === 'saved' ? '' : searchInput.trim());
  const reelsQuery = useReelsFeed({ enabled: isReady });

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

  const rawPosts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [postsQuery.data],
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

  const activePost = activeIndex >= 0 ? posts[activeIndex] ?? null : null;
  const isMediaError = Boolean(activePost && mediaErrorPostId === activePost.id);
  const isCaptionExpanded = Boolean(activePost && captionExpandedPostId === activePost.id);

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

  // Tự động tải trang bài viết tiếp theo khi người dùng lướt gần tới cuối danh sách
  useEffect(() => {
    if (
      activeIndex >= 0 &&
      activeIndex >= posts.length - 2 &&
      postsQuery.hasNextPage &&
      !postsQuery.isFetchingNextPage
    ) {
      void postsQuery.fetchNextPage();
    }
  }, [activeIndex, posts.length, postsQuery]);

  // Khi chuyển bài (activePost?.id thay đổi):
  // 1. Dừng và giải phóng video cũ
  // 2. Reset scroll của danh sách bình luận về đầu
  useEffect(() => {
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTop = 0;
    }

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }, [activePost?.id]);

  function selectPostByOffset(delta: -1 | 1) {
    if (posts.length === 0) return;
    const nextIdx = activeIndex + delta;
    const target = posts[nextIdx];
    if (target) {
      setVideoProgress(0);
      setPlaying(true);
      setActivePostId(target.id);
    }
  }

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
      if (
        galleryState &&
        activePost &&
        galleryState.postId === activePost.id &&
        postImages.length > 0
      ) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setGalleryState(null);
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setGalleryState((prev) =>
            prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null,
          );
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setGalleryState((prev) =>
            prev ? { ...prev, index: Math.min(postImages.length - 1, prev.index + 1) } : null,
          );
          return;
        }
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectPostByOffset(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectPostByOffset(-1);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const trip = activePost?.tripAttachment ?? null;
  const hasItinerary = Boolean(
    trip &&
      (trip.destinationName ||
        trip.hotelName ||
        trip.daysCount ||
        trip.estimatedCostPerPerson ||
        (trip.items && trip.items.length > 0)),
  );
  const showLeftPanel = hasItinerary && isLeftOpen;
  const showRightPanel = Boolean(activePost) && isRightOpen;

  const gridLayoutClass =
    showLeftPanel && showRightPanel
      ? styles.gridThreeCols
      : !showLeftPanel && showRightPanel
        ? styles.gridNoLeft
        : showLeftPanel && !showRightPanel
          ? styles.gridNoRight
          : styles.gridCenterOnly;

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
  const activeGalleryIndex =
    galleryState && activePost && galleryState.postId === activePost.id
      ? Math.min(galleryState.index, Math.max(0, postImages.length - 1))
      : null;

  const activePostDetail =
    postDetailQuery.data?.post.id === activePost?.id ? postDetailQuery.data : undefined;
  const viewerContext = activePostDetail?.viewerContext;

  const serverLiked = viewerContext
    ? viewerContext.myReaction !== null
    : Boolean(reelCard?.viewerState?.liked);
  const serverSaved = viewerContext
    ? viewerContext.isBookmarked
    : filterMode === 'saved' || Boolean(reelCard?.viewerState?.saved);

  const isLiked = activePost ? (optimisticLikes[activePost.id] ?? serverLiked) : false;
  const isSaved = activePost ? (optimisticSaves[activePost.id] ?? serverSaved) : false;

  const baseLikes = activePostDetail?.post.reactionTotal ?? activePost?.reactionTotal ?? 0;
  const baseSaves = activePostDetail?.post.bookmarkCount ?? activePost?.bookmarkCount ?? 0;
  const displayLikes = Math.max(0, baseLikes + Number(isLiked) - Number(serverLiked));
  const displaySaves = Math.max(0, baseSaves + Number(isSaved) - Number(serverSaved));
  const displayComments = activePostDetail?.post.commentCount ?? activePost?.commentCount ?? 0;
  const displayShares = activePostDetail?.post.shareCount ?? activePost?.shareCount ?? 0;

  const authorInfo = activePost
    ? formatAuthorDisplay(activePost.authorId, reelCard?.author.name, user?.id, user?.displayName)
    : { name: '', handle: '' };

  // Nhóm lịch trình theo từng ngày (Vertical Timeline)
  const groupedDays = useMemo(() => {
    const items = trip?.items ?? [];
    const byDay = new Map<number, typeof items>();
    for (const item of items) {
      const list = byDay.get(item.day) ?? [];
      list.push(item);
      byDay.set(item.day, list);
    }
    return [...byDay.entries()].sort((first, second) => first[0] - second[0]);
  }, [trip?.items]);

  // Trích xuất danh sách POI thực tế từ lịch trình
  const itineraryPois = useMemo(() => {
    if (!trip) return [];
    const seen = new Set<string>();
    const list: { name: string; sub?: string }[] = [];
    if (trip.hotelName?.trim()) {
      seen.add(trip.hotelName.trim().toLowerCase());
      list.push({ name: trip.hotelName.trim(), sub: trip.destinationName });
    }
    for (const item of trip.items ?? []) {
      const place = (item.location ?? item.title).trim();
      if (place && !seen.has(place.toLowerCase())) {
        seen.add(place.toLowerCase());
        list.push({
          name: place,
          sub: t('api.immersiveDayHeading', { day: item.day }),
        });
      }
    }
    if (list.length === 0 && trip.destinationName?.trim()) {
      list.push({ name: trip.destinationName.trim() });
    }
    return list;
  }, [trip]);

  const loginReturnHref = '/login?returnTo=%2Finspiration';

  function handleCommentButtonClick() {
    if (!isRightOpen) {
      setRightOpen(true);
      setTimeout(() => commentInputRef.current?.focus(), 120);
      return;
    }
    setRightOpen(false);
  }

  function handleStageWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) < 28) return;
    const now = Date.now();
    if (now < wheelLockUntilRef.current) return;
    wheelLockUntilRef.current = now + 460;
    selectPostByOffset(event.deltaY > 0 ? 1 : -1);
  }

  function handleToggleFullscreen() {
    const el = stageFrameRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen();
    }
  }

  // Click outside & Escape để tự động đóng Popover tìm kiếm / bộ lọc
  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSearchOpen]);

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

  const hasActiveSearchOrFilter = searchInput.trim() !== '' || filterMode !== 'all';

  return (
    <div className={styles.immersiveRoot}>
      {/* Nội dung chính: 3 Panel Đồng bộ theo activePost */}
      <div className={`${styles.viewerGrid} ${gridLayoutClass}`}>
        {/* ================================================================
            1. LEFT PANEL — ATTACHED ITINERARY (Thu gọn khi không có lịch trình)
            ================================================================ */}
        {showLeftPanel && trip && activePost && (
            <aside className={styles.leftPanel} aria-label={vi.api.immersiveItineraryTitle}>
              <div className={styles.panelHeaderBar}>
                <h2 className={styles.panelHeaderTitle}>
                  <span className={styles.panelHeaderIcon}>
                    <SocialIcon name="calendar" size={18} />
                  </span>
                  {vi.api.immersiveItineraryTitle}
                </h2>
                <button
                  type="button"
                  className={styles.iconGhostBtn}
                  aria-label={vi.api.immersiveItineraryCollapse}
                  title={vi.api.immersiveItineraryCollapse}
                  onClick={() => setLeftOpen(false)}
                >
                  <SocialIcon name="chevronLeft" size={18} />
                </button>
              </div>

              {/* Trip Overview Card */}
              <div className={styles.tripOverviewCard}>
                <div className={styles.tripOverviewTop}>
                  <span className={styles.tripOverviewThumb}>
                    <Image
                      src={coverImage ?? POST_COVER_MASCOT}
                      alt=""
                      fill
                      sizes="78px"
                      unoptimized={Boolean(coverImage?.startsWith('http'))}
                    />
                  </span>
                  <div className={styles.tripOverviewMeta}>
                    <h3 className={styles.tripOverviewTitle}>
                      {trip.hotelName ?? trip.destinationName ?? activePost.title}
                    </h3>
                    {(trip.destinationName || activePost.hashtags.length > 0) && (
                      <p className={styles.tripOverviewTags}>
                        {[trip.destinationName, ...activePost.hashtags.slice(0, 2)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <div className={styles.tripOverviewFacts}>
                      {Boolean(trip.daysCount) && (
                        <span className={styles.tripFactLine}>
                          <SocialIcon name="clock" size={14} />
                          {t('api.postTripDaysBadge', { count: trip.daysCount! })}
                        </span>
                      )}
                      {Boolean(trip.estimatedCostPerPerson) && (
                        <span className={styles.tripFactLine}>
                          <SocialIcon name="wallet" size={14} />
                          ~
                          {trip.estimatedCostPerPerson!.toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          })}
                          /người
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href={
                    trip.hotelId
                      ? `/hotels/${encodeURIComponent(trip.hotelId)}`
                      : `/search?q=${encodeURIComponent(
                          trip.hotelName ?? trip.destinationName ?? activePost.title,
                        )}`
                  }
                  className={styles.tripOverviewCta}
                >
                  {vi.api.immersiveViewTripDetail}
                  <SocialIcon name="arrowUpRight" size={16} />
                </Link>
              </div>

              {/* 3 Tabs: Lịch trình | Điểm đến | Chi phí */}
              <div className={styles.panelTabsRow} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={leftTab === 'schedule'}
                  className={`${styles.panelTabItem} ${
                    leftTab === 'schedule' ? styles.panelTabItemActive : ''
                  }`}
                  onClick={() => setLeftTab('schedule')}
                >
                  {vi.api.immersiveTabSchedule}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={leftTab === 'destinations'}
                  className={`${styles.panelTabItem} ${
                    leftTab === 'destinations' ? styles.panelTabItemActive : ''
                  }`}
                  onClick={() => setLeftTab('destinations')}
                >
                  {t('api.immersiveTabDestinations', { count: itineraryPois.length })}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={leftTab === 'cost'}
                  className={`${styles.panelTabItem} ${
                    leftTab === 'cost' ? styles.panelTabItemActive : ''
                  }`}
                  onClick={() => setLeftTab('cost')}
                >
                  {vi.api.immersiveTabCost}
                </button>
              </div>

              {/* Nội dung cuộn độc lập của Left Panel */}
              <div className={styles.leftScrollBody}>
                {leftTab === 'schedule' && (
                  <>
                    {groupedDays.length === 0 ? (
                      <p className="small muted">{vi.api.immersiveNoTimelineItems}</p>
                    ) : (
                      <div className={styles.timelineContainer}>
                        {groupedDays.map(([dayNumber, dayItems]) => (
                          <div key={dayNumber} className={styles.timelineDayBlock}>
                            <span className={styles.timelineDayDot} aria-hidden="true" />
                            <h4 className={styles.timelineDayTitle}>
                              {t('api.immersiveDayHeading', { day: dayNumber })}
                            </h4>
                            <ol className={styles.timelineStopsList}>
                              {dayItems.map((stop, stopIdx) => {
                                const stopCover = getPostCover(
                                  stop.location ?? trip.destinationName,
                                  stop.title,
                                );
                                return (
                                  <li key={stopIdx} className={styles.timelineStopCard}>
                                    {stopCover ? (
                                      <span className={styles.timelineStopThumb}>
                                        <Image src={stopCover} alt="" fill sizes="48px" />
                                      </span>
                                    ) : null}
                                    <span className={styles.timelineStopIcon}>
                                      <SocialIcon name="pin" size={13} />
                                    </span>
                                    <div className={styles.timelineStopInfo}>
                                      <span className={styles.timelineStopName}>{stop.title}</span>
                                      {(stop.location || stop.notes) && (
                                        <span className={styles.timelineStopMeta}>
                                          {[stop.location, stop.notes].filter(Boolean).join(' · ')}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {leftTab === 'destinations' && (
                  <>
                    {itineraryPois.length === 0 ? (
                      <p className="small muted">{vi.api.immersiveNoDestinations}</p>
                    ) : (
                      <ul className={styles.poiList}>
                        {itineraryPois.map((poi) => (
                          <li key={poi.name}>
                            <Link
                              href={`/search?q=${encodeURIComponent(poi.name)}`}
                              className={styles.poiCardLink}
                            >
                              <span>
                                {poi.name}
                                {poi.sub && (
                                  <span className="small muted"> · {poi.sub}</span>
                                )}
                              </span>
                              <SocialIcon name="arrowUpRight" size={16} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {leftTab === 'cost' && (
                  <>
                    {trip.estimatedCostPerPerson ? (
                      <div className={styles.costBox}>
                        <span className="small muted">{vi.api.immersiveEstimatedBudgetLabel}</span>
                        <strong className={styles.costAmount}>
                          ~
                          {trip.estimatedCostPerPerson.toLocaleString('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          })}
                        </strong>
                        {trip.priceDisclaimer && (
                          <p className="small muted">{trip.priceDisclaimer}</p>
                        )}
                      </div>
                    ) : (
                      <p className="small muted">{vi.api.immersiveNoCostData}</p>
                    )}
                  </>
                )}
              </div>
            </aside>
          )}

          {/* ================================================================
              2. CENTER PANEL — IMMERSIVE MEDIA VIEWER + VERTICAL ACTION BAR
              ================================================================ */}
          <section
            className={styles.centerPanel}
            aria-label={activePost ? activePost.title : vi.api.feedNavAria}
            onWheel={handleStageWheel}
            onTouchStart={(event) => {
              touchStartYRef.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const startY = touchStartYRef.current;
              const endY = event.changedTouches[0]?.clientY;
              if (startY !== null && endY !== undefined && Math.abs(startY - endY) > 50) {
                selectPostByOffset(startY > endY ? 1 : -1);
              }
              touchStartYRef.current = null;
            }}
          >
            {/* Cột tiện ích xếp dọc mép trái Center Panel (dọc theo Sidebar Lịch trình) */}
            <div ref={searchContainerRef} className={styles.centerFloatingTopLeft}>
              <div className={styles.floatingTopRow}>
                <button
                  type="button"
                  className={`${styles.floatingIconBtn} ${
                    isSearchOpen || hasActiveSearchOrFilter ? styles.floatingIconBtnActive : ''
                  }`}
                  aria-expanded={isSearchOpen}
                  aria-label={vi.api.feedSearchPlaceholder}
                  title={vi.api.feedSearchPlaceholder}
                  onClick={() => {
                    const next = !isSearchOpen;
                    setSearchOpen(next);
                    if (next) {
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    }
                  }}
                >
                  <SocialIcon name="search" size={18} />
                  {hasActiveSearchOrFilter && (
                    <span className={styles.floatingActiveDot} aria-hidden="true" />
                  )}
                </button>

                {user ? (
                  <button
                    type="button"
                    className={styles.floatingCircleAccentBtn}
                    aria-label={vi.api.feedCreatePostCta}
                    title={vi.api.feedCreatePostCta}
                    onClick={() => setComposerModalOpen(true)}
                  >
                    <SocialIcon name="plus" size={18} />
                  </button>
                ) : (
                  <Link
                    href={loginReturnHref}
                    className={styles.floatingCircleAccentBtn}
                    aria-label={vi.api.feedCreatePostCta}
                    title={vi.api.feedCreatePostCta}
                  >
                    <SocialIcon name="plus" size={18} />
                  </Link>
                )}

                {hasItinerary && !isLeftOpen && (
                  <button
                    type="button"
                    className={styles.floatingIconBtn}
                    aria-expanded={isLeftOpen}
                    aria-label={vi.api.immersiveItineraryExpand}
                    title={vi.api.immersiveItineraryExpand}
                    onClick={() => setLeftOpen(true)}
                  >
                    <SocialIcon name="calendar" size={18} />
                  </button>
                )}
              </div>

              {isSearchOpen && (
                <div className={styles.floatingSearchPopover}>
                  <div className={styles.searchPill}>
                    <SocialIcon name="search" size={16} />
                    <input
                      ref={searchInputRef}
                      type="search"
                      className={styles.searchInput}
                      aria-label={vi.api.feedSearchPlaceholder}
                      placeholder={vi.api.feedSearchPlaceholder}
                      value={searchInput}
                      onChange={(event) => {
                        if (filterMode === 'saved') setFilterMode('all');
                        setSearchInput(event.target.value);
                      }}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        className={styles.searchClearBtn}
                        aria-label={vi.api.commentPanelClose}
                        onClick={() => setSearchInput('')}
                      >
                        <SocialIcon name="close" size={12} />
                      </button>
                    )}
                  </div>

                  <nav className={styles.filterGroup} aria-label={vi.api.feedNavAria}>
                    <button
                      type="button"
                      className={`${styles.filterPill} ${
                        filterMode === 'all' ? styles.filterPillActive : ''
                      }`}
                      aria-pressed={filterMode === 'all'}
                      onClick={() => setFilterMode('all')}
                    >
                      <SocialIcon name="sparkles" size={14} />
                      {vi.api.immersiveFilterAll}
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterPill} ${
                        filterMode === 'withTrip' ? styles.filterPillActive : ''
                      }`}
                      aria-pressed={filterMode === 'withTrip'}
                      onClick={() => setFilterMode('withTrip')}
                    >
                      <SocialIcon name="calendar" size={14} />
                      {vi.api.immersiveFilterWithTrip}
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterPill} ${
                        filterMode === 'saved' ? styles.filterPillActive : ''
                      }`}
                      aria-pressed={filterMode === 'saved'}
                      onClick={() => setFilterMode('saved')}
                    >
                      <SocialIcon
                        name={filterMode === 'saved' ? 'bookmarkFilled' : 'bookmark'}
                        size={14}
                      />
                      {vi.api.immersiveFilterSaved}
                    </button>
                  </nav>
                </div>
              )}
            </div>

            {filterMode === 'saved' && !user ? (
              <div className={`empty-state ${styles.centerEmptyBox}`}>
                <p>{vi.api.loginRequired}</p>
                <Link href={loginReturnHref} className={styles.createPostBtn}>
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
                {filterMode === 'saved'
                  ? vi.api.noBookmarks
                  : searchInput.trim()
                    ? t('api.noPostsForKeyword', { query: searchInput.trim() })
                    : vi.api.noPosts}
              </p>
            ) : (
              <>
                <div ref={stageFrameRef} className={styles.mediaStageFrame}>
              {coverImage && (
                <div
                  className={styles.mediaBackdropBlur}
                  style={{ backgroundImage: `url(${coverImage})` }}
                />
              )}

              {/* Top-Left Volume + Slider & Top-Right Hover Controls (More / Fullscreen) */}
              {activeGalleryIndex === null && (
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
                      href={`/trips/${activePost.id}`}
                      className={styles.stageCircleBtn}
                      aria-label={vi.api.postMoreOptions}
                      title={vi.api.detail}
                    >
                      <SocialIcon name="more" size={18} />
                    </Link>
                    <button
                      type="button"
                      className={styles.stageCircleBtn}
                      aria-label={vi.api.immersiveFullscreen}
                      onClick={handleToggleFullscreen}
                    >
                      <SocialIcon name="maximize" size={17} />
                    </button>
                  </div>
                </>
              )}

              {/* Media Content: Video -> Adaptive Image Grid -> Text-Only */}
              {reelCard?.video && activePost.postType === 'video' && !isMediaError ? (
                <>
                  <video
                    key={activePost.id}
                    ref={videoRef}
                    className={`${styles.mediaVideoElement} ${
                      reelCard.video.aspect === '16:9' ? styles.mediaVideoLandscape : ''
                    }`}
                    src={reelCard.video.hlsUrl}
                    poster={selectReelPoster(reelCard.video.posters, 720)}
                    playsInline
                    loop
                    autoPlay
                    muted={isMuted}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(event) => {
                      const el = event.currentTarget;
                      if (el.duration > 0) {
                        setVideoProgress((el.currentTime / el.duration) * 100);
                      }
                    }}
                    onError={() => setMediaErrorPostId(activePost.id)}
                    onClick={() => {
                      const el = videoRef.current;
                      if (!el) return;
                      if (el.paused) {
                        void el.play();
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
                    }}
                  >
                    <track kind="captions" />
                  </video>
                  <button
                    type="button"
                    className={`${styles.centerPlayOverlayBtn} ${
                      !showPlayFlash ? styles.centerPlayOverlayHidden : ''
                    }`}
                    aria-label={isPlaying ? vi.api.immersivePauseVideo : vi.api.immersivePlayVideo}
                    tabIndex={-1}
                    onClick={() => {
                      const el = videoRef.current;
                      if (!el) return;
                      if (el.paused) {
                        void el.play();
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
                    }}
                  >
                    <SocialIcon name={isPlaying ? 'play' : 'pause'} size={26} />
                  </button>
                  <div className={styles.progressBarTrack} aria-hidden="true">
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.min(100, Math.max(0, videoProgress))}%` }}
                    />
                  </div>
                </>
              ) : postImages.length > 0 ? (
                (() => {
                  const totalCount = postImages.length;
                  const leadOrientation =
                    (coverImage ? imageOrientations[coverImage] : undefined) ?? 'portrait';
                  const isLeadLandscape = leadOrientation === 'landscape';
                  const visibleCount = totalCount >= 5 ? 5 : totalCount;
                  const visibleList = postImages.slice(0, visibleCount);

                  const gridVariantClass =
                    totalCount === 1
                      ? styles.gridSingle
                      : totalCount === 2
                        ? isLeadLandscape
                          ? styles.gridTwoRows
                          : styles.gridTwoCols
                        : totalCount === 3
                          ? isLeadLandscape
                            ? styles.gridThreeLandscape
                            : styles.gridThreePortrait
                          : totalCount === 4
                            ? isLeadLandscape
                              ? styles.gridFourLandscape
                              : styles.gridFour
                            : styles.gridFiveCollage;

                  const fiveTileClasses = [
                    styles.collageLeftTop,
                    styles.collageLeftBottom,
                    styles.collageRightTop,
                    styles.collageRightMiddle,
                    styles.collageRightBottom,
                  ];

                  return (
                    <div
                      key={activePost.id}
                      className={`${styles.adaptiveImageGrid} ${gridVariantClass}`}
                    >
                      {visibleList.map((img, idx) => {
                        const imgOrientation = imageOrientations[img.src];
                        const isSingleLandscape = totalCount === 1 && isLeadLandscape;

                        let cellSpanClass = '';
                        if (totalCount === 1 && isSingleLandscape) {
                          cellSpanClass = styles.gridCellSingleBackdrop ?? '';
                        } else if (totalCount === 3 && idx === 0) {
                          cellSpanClass = isLeadLandscape
                            ? (styles.gridCellSpanTwoCols ?? '')
                            : (styles.gridCellSpanTwoRows ?? '');
                        } else if (totalCount === 4 && isLeadLandscape && idx === 0) {
                          cellSpanClass = styles.gridCellSpanThreeCols ?? '';
                        } else if (totalCount >= 5) {
                          cellSpanClass = fiveTileClasses[idx] ?? '';
                        }

                        const extraCount =
                          totalCount > 5 && idx === 4 ? totalCount - 4 : 0;

                        const resolvedObjectPosition =
                          imgOrientation === 'portrait'
                            ? 'center 25%'
                            : imgOrientation === 'landscape'
                              ? 'center center'
                              : img.focalPoint;

                        return (
                          <button
                            key={img.src}
                            type="button"
                            className={`${styles.gridCellBtn} ${cellSpanClass}`}
                            aria-label={t('api.immersiveOpenImageAria', {
                              index: idx + 1,
                              total: totalCount,
                            })}
                            onClick={() => setGalleryState({ postId: activePost.id, index: idx })}
                          >
                            <Image
                              src={img.src}
                              alt={activePost.title}
                              fill
                              className={
                                isSingleLandscape ? styles.gridCellImgContain : styles.gridCellImg
                              }
                              style={
                                isSingleLandscape
                                  ? undefined
                                  : { objectPosition: resolvedObjectPosition }
                              }
                              sizes="(max-width: 1024px) 100vw, 480px"
                              priority={idx === 0}
                              unoptimized={img.src.startsWith('http')}
                              onLoad={(event) => {
                                const el = event.currentTarget;
                                if (!el.naturalWidth || !el.naturalHeight) return;
                                const ratio = el.naturalWidth / el.naturalHeight;
                                const nextOrientation: 'portrait' | 'landscape' | 'square' =
                                  ratio > 1.15
                                    ? 'landscape'
                                    : ratio < 0.9
                                      ? 'portrait'
                                      : 'square';
                                setImageOrientations((prev) =>
                                  prev[img.src] === nextOrientation
                                    ? prev
                                    : { ...prev, [img.src]: nextOrientation },
                                );
                              }}
                            />
                            {extraCount > 0 && (
                              <span className={styles.gridCellMoreOverlay} aria-hidden="true">
                                +{extraCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className={styles.textOnlyStage}>
                  <h2 className={styles.textOnlyTitle}>{activePost.title}</h2>
                  <p className={styles.textOnlyBody}>{activePost.body}</p>
                </div>
              )}

              {/* In-Stage Image Gallery (object-fit: contain, 1/N indicator, prev/next slide, close) */}
              {activeGalleryIndex !== null && postImages[activeGalleryIndex] && (
                <section
                  className={styles.galleryStageOverlay}
                  aria-label={activePost.title}
                >
                  <div className={styles.galleryTopBar}>
                    <span className={styles.galleryCountPill}>
                      {activeGalleryIndex + 1} / {postImages.length}
                    </span>
                    <button
                      type="button"
                      className={styles.galleryCloseBtn}
                      aria-label={vi.api.immersiveCloseGallery}
                      title={vi.api.immersiveCloseGallery}
                      onClick={() => setGalleryState(null)}
                    >
                      <SocialIcon name="close" size={18} />
                    </button>
                  </div>

                  <div className={styles.galleryContainFrame}>
                    <Image
                      key={postImages[activeGalleryIndex].src}
                      src={postImages[activeGalleryIndex].src}
                      alt={activePost.title}
                      fill
                      className={styles.galleryContainImg}
                      sizes="(max-width: 1024px) 100vw, 540px"
                      priority
                      unoptimized={postImages[activeGalleryIndex].src.startsWith('http')}
                    />
                  </div>

                  {postImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={`${styles.gallerySlideNavBtn} ${styles.gallerySlidePrev}`}
                        disabled={activeGalleryIndex <= 0}
                        aria-label={vi.api.immersivePrevSlide}
                        title={vi.api.immersivePrevSlide}
                        onClick={() =>
                          setGalleryState({
                            postId: activePost.id,
                            index: Math.max(0, activeGalleryIndex - 1),
                          })
                        }
                      >
                        <SocialIcon name="chevronLeft" size={20} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.gallerySlideNavBtn} ${styles.gallerySlideNext}`}
                        disabled={activeGalleryIndex >= postImages.length - 1}
                        aria-label={vi.api.immersiveNextSlide}
                        title={vi.api.immersiveNextSlide}
                        onClick={() =>
                          setGalleryState({
                            postId: activePost.id,
                            index: Math.min(postImages.length - 1, activeGalleryIndex + 1),
                          })
                        }
                      >
                        <SocialIcon name="chevronRight" size={20} />
                      </button>
                    </>
                  )}
                </section>
              )}

              {/* Bottom Post Overlay: Tác giả, Caption, Hashtags, Compact Trip Card */}
              <div className={styles.stageBottomOverlay}>
                <div className={styles.overlayAuthorRow}>
                  <span className={styles.overlayAvatar} aria-hidden="true">
                    {getInitial(authorInfo.name)}
                  </span>
                  <div className={styles.overlayAuthorMeta}>
                    <div className={styles.overlayAuthorNameRow}>
                      <span>{authorInfo.name}</span>
                      {(activePost.isVerified || reelCard?.author.isKol) && (
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
                      <strong>{activePost.title}</strong> — {activePost.body}
                    </p>
                    {activePost.body.length > 90 && (
                      <button
                        type="button"
                        className={styles.overlayExpandBtn}
                        onClick={() =>
                          setCaptionExpandedPostId((prev) =>
                            prev === activePost.id ? null : activePost.id,
                          )
                        }
                      >
                        {isCaptionExpanded ? vi.api.postShowLess : vi.api.postReadMore}
                      </button>
                    )}
                  </div>
                )}

                {activePost.hashtags.length > 0 && (
                  <div className={styles.overlayTagRow}>
                    {activePost.hashtags.slice(0, 4).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={styles.overlayTagPill}
                        onClick={() => {
                          setSearchInput(tag);
                          setSearchOpen(true);
                          setTimeout(() => searchInputRef.current?.focus(), 0);
                        }}
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
                    onClick={() => setLeftOpen(true)}
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
                          {trip.hotelName ?? trip.destinationName ?? activePost.title}
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
                              ? `~${trip.estimatedCostPerPerson.toLocaleString('vi-VN')}đ/người`
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

              {isPostNotFound && (
                <div className={styles.postUnavailableOverlay} role="alert">
                  <div className={styles.postUnavailableIcon} aria-hidden="true">
                    ⚠️
                  </div>
                  <h3 className={styles.postUnavailableTitle}>{vi.api.postUnavailable}</h3>
                  <p className={styles.postUnavailableDesc}>{vi.api.postUnavailableHint}</p>
                  {posts.length > 1 && (
                    <button
                      type="button"
                      className={styles.postUnavailableNextBtn}
                      onClick={() => selectPostByOffset(1)}
                    >
                      {vi.api.postUnavailableNext}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cột phải sát cạnh Media Stage: Vertical Action Bar (Avatar +, Like, Comment, Save, Share) */}
            <div className={styles.stageSideDock}>
              <div className={styles.verticalActionsCluster}>
                <Link
                  href={`/trips/${activePost.id}`}
                  className={styles.actionAvatarBadgeWrap}
                  aria-label={authorInfo.name}
                >
                  <span className={styles.actionAvatarCircle}>{getInitial(authorInfo.name)}</span>
                  <span className={styles.actionAvatarPlus} aria-hidden="true">
                    +
                  </span>
                </Link>

                {user ? (
                  <button
                    type="button"
                    className={`${styles.verticalActionItem} ${
                      isLiked ? styles.verticalActionLiked : ''
                    }`}
                    aria-pressed={isLiked}
                    aria-label={vi.api.like}
                    onClick={() =>
                      engagementMutation.mutate({
                        postId: activePost.id,
                        type: 'like',
                        nextSelected: !isLiked,
                      })
                    }
                  >
                    <span className={styles.verticalActionCircle}>
                      <SocialIcon name={isLiked ? 'heartFilled' : 'heart'} size={20} />
                    </span>
                    <span className={styles.verticalActionCount}>
                      {formatCompactCount(displayLikes)}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={loginReturnHref}
                    className={styles.verticalActionItem}
                    aria-label={vi.api.like}
                  >
                    <span className={styles.verticalActionCircle}>
                      <SocialIcon name="heart" size={20} />
                    </span>
                    <span className={styles.verticalActionCount}>
                      {formatCompactCount(displayLikes)}
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  className={`${styles.verticalActionItem} ${
                    isRightOpen ? styles.verticalActionActive : ''
                  }`}
                  aria-expanded={isRightOpen}
                  aria-label={t('api.commentsWithCount', { count: displayComments })}
                  onClick={handleCommentButtonClick}
                >
                  <span className={styles.verticalActionCircle}>
                    <SocialIcon name="comment" size={20} />
                  </span>
                  <span className={styles.verticalActionCount}>
                    {formatCompactCount(displayComments)}
                  </span>
                </button>

                {user ? (
                  <button
                    type="button"
                    className={`${styles.verticalActionItem} ${
                      isSaved ? styles.verticalActionSaved : ''
                    }`}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? vi.api.unbookmark : vi.api.bookmark}
                    onClick={() =>
                      engagementMutation.mutate({
                        postId: activePost.id,
                        type: 'save',
                        nextSelected: !isSaved,
                      })
                    }
                  >
                    <span className={styles.verticalActionCircle}>
                      <SocialIcon name={isSaved ? 'bookmarkFilled' : 'bookmark'} size={20} />
                    </span>
                    <span className={styles.verticalActionCount}>
                      {formatCompactCount(displaySaves)}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={loginReturnHref}
                    className={styles.verticalActionItem}
                    aria-label={vi.api.bookmark}
                  >
                    <span className={styles.verticalActionCircle}>
                      <SocialIcon name="bookmark" size={20} />
                    </span>
                    <span className={styles.verticalActionCount}>
                      {formatCompactCount(displaySaves)}
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  className={styles.verticalActionItem}
                  aria-label={vi.api.share}
                  onClick={() =>
                    engagementMutation.mutate({
                      postId: activePost.id,
                      type: 'share',
                    })
                  }
                >
                  <span className={styles.verticalActionCircle}>
                    <SocialIcon name="share" size={20} />
                  </span>
                  <span className={styles.verticalActionCount}>
                    {formatCompactCount(displayShares)}
                  </span>
                </button>
              </div>
            </div>

            {/* Cụm nút Chuyển bài (▲ / 1/10 / ▼) nằm giữa chiều cao, sát mép phải của Center Panel */}
            <div className={styles.navArrowsCluster}>
              <button
                type="button"
                className={styles.navArrowBtn}
                aria-label={vi.api.immersivePrevPost}
                title={vi.api.immersivePrevPost}
                disabled={activeIndex <= 0}
                onClick={() => selectPostByOffset(-1)}
              >
                <SocialIcon name="arrowUp" size={20} />
              </button>
              {posts.length > 0 && (
                <span className={styles.postCounterBadge}>
                  {activeIndex + 1}/{posts.length}
                </span>
              )}
              <button
                type="button"
                className={styles.navArrowBtn}
                aria-label={vi.api.immersiveNextPost}
                title={vi.api.immersiveNextPost}
                disabled={activeIndex >= posts.length - 1 && !postsQuery.hasNextPage}
                onClick={() => selectPostByOffset(1)}
              >
                <SocialIcon name="arrowDown" size={20} />
              </button>
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
              />
            </aside>
          )}
        </div>

      {/* Modal Đăng bài nhanh khi nhấn "+ Đăng bài" */}
      {isComposerModalOpen && user && (
        <ComposerModal onClose={() => setComposerModalOpen(false)} />
      )}
    </div>
  );
}

/**
 * Luồng bình luận cha–con đồng bộ theo postId ở Right Panel,
 * đi kèm Sticky Comment Composer cố định ở đáy Right Panel.
 */
function RightPanelCommentsSynchronized({
  post,
  loginHref,
  scrollContainerRef,
  composerInputRef,
}: {
  post: {
    id: string;
    authorId: string;
  };
  loginHref: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  composerInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['social', 'comments', post.id, undefined, user?.id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => socialApi.listComments(post.id, pageParam, undefined, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const addMutation = useMutation({
    mutationFn: () => socialApi.addComment(post.id, body.trim(), replyTarget?.id),
    onSuccess: async () => {
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
      <div ref={scrollContainerRef} className={styles.rightScrollArea}>
        <ApiErrorNotice error={addMutation.error} />
        <ApiErrorNotice
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        {query.isPending && <output className="small muted">{vi.api.loading}</output>}
        {query.isSuccess && comments.length === 0 && (
          <p className="small muted">{vi.api.noComments}</p>
        )}

        <ol className={styles.panelCommentList}>
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              postId={post.id}
              postAuthorId={post.authorId}
              comment={comment}
              loginHref={loginHref}
              onReplySelect={(target) => {
                setReplyTarget(target);
                composerInputRef.current?.focus();
              }}
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
              onClick={() => setReplyTarget(null)}
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
            <span className={styles.avatarSmall} aria-hidden="true">
              {getInitial(user.displayName)}
            </span>
            <input
              ref={composerInputRef}
              className={styles.panelComposerInput}
              aria-label={vi.api.commentInputPlaceholder}
              placeholder={vi.api.commentInputPlaceholder}
              value={body}
              maxLength={10000}
              onChange={(event) => setBody(event.target.value)}
            />
            <button
              type="submit"
              className={styles.panelSendBtn}
              aria-label={vi.api.send}
              disabled={addMutation.isPending || !body.trim()}
            >
              <SocialIcon name="send" size={15} />
            </button>
          </form>
        ) : (
          <Link className="comment-login" href={loginHref}>
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
  comment,
  isReply = false,
  loginHref,
  onReplySelect,
}: {
  postId: string;
  postAuthorId: string;
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
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);

  const isMine = comment.authorId === user?.id;
  const isPostAuthor = comment.authorId === postAuthorId;
  const authorDisplay = formatAuthorDisplay(comment.authorId, comment.authorName, user?.id, user?.displayName);

  const isCommentLiked = optimisticLiked ?? comment.isLiked;
  const displayCommentLikes = Math.max(
    0,
    comment.likeCount + Number(isCommentLiked) - Number(comment.isLiked),
  );

  const repliesQuery = useInfiniteQuery({
    queryKey: ['social', 'comments', postId, comment.id, user?.id],
    initialPageParam: undefined as string | undefined,
    enabled: !isReply,
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
  const totalReplies = repliesQuery.data?.pages[0]?.total ?? replies.length;

  return (
    <li className={styles.panelCommentItem}>
      <div className={styles.panelCommentRow}>
        <span className={styles.avatarSmall} aria-hidden="true">
          {getInitial(authorDisplay.name)}
        </span>
        <div className={styles.panelCommentContent}>
          <div className={styles.panelCommentMeta}>
            <span className={styles.panelCommentAuthor}>{authorDisplay.name}</span>
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

/** Modal tạo bài đăng mới khi nhấn nút "+ Đăng bài" trên thanh công cụ. */
function ComposerModal({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsedTags = hashtagsText
        .split(/[,\s#]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const draft = await socialApi.createDraft({
        post_type: 'vlog',
        title: title.trim(),
        body: body.trim(),
        hashtags: parsedTags,
        visibility: 'public',
        ...(destinationName.trim()
          ? { trip_attachment: { destinationName: destinationName.trim() } }
          : {}),
      });
      await socialApi.publishPost(draft.id);
      return draft;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['social'] });
      onClose();
    },
  });

  return (
    <dialog open className={styles.modalBackdrop} aria-label={vi.api.feedCreatePostCta}>
      <form
        className={styles.composerModalCard}
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !body.trim()) return;
          createMutation.mutate();
        }}
      >
        <div className={styles.panelHeaderBar}>
          <h3 className={styles.panelHeaderTitle}>{vi.api.feedCreatePostCta}</h3>
          <button
            type="button"
            className={styles.iconGhostBtn}
            aria-label={vi.api.cancel}
            onClick={onClose}
          >
            <SocialIcon name="close" size={18} />
          </button>
        </div>

        <input
          className={styles.composerInput}
          aria-label={vi.api.title}
          placeholder={vi.api.composerTitlePlaceholder}
          required
          maxLength={255}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className={styles.composerTextarea}
          aria-label={vi.api.body}
          placeholder={vi.api.composerPlaceholder}
          required
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className={styles.composerMetaRow}>
          <input
            className={styles.composerInput}
            aria-label={vi.api.composerAttachTripAction}
            placeholder={vi.api.composerDestinationPlaceholder}
            value={destinationName}
            onChange={(event) => setDestinationName(event.target.value)}
          />
          <input
            className={styles.composerInput}
            aria-label={vi.api.hashtags}
            placeholder={vi.api.composerHashtagPlaceholder}
            value={hashtagsText}
            onChange={(event) => setHashtagsText(event.target.value)}
          />
        </div>

        <ApiErrorNotice error={createMutation.error} />

        <div className={styles.composerModalFooter}>
          <button type="button" className={styles.utilityBtn} onClick={onClose}>
            {vi.api.cancel}
          </button>
          <button
            type="submit"
            className={styles.createPostBtn}
            disabled={createMutation.isPending || !title.trim() || !body.trim()}
          >
            {createMutation.isPending ? vi.api.saving : vi.api.composerSubmit}
          </button>
        </div>
      </form>
    </dialog>
  );
}
