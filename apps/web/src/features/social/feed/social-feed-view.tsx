'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useQueryClient, useMutation, type InfiniteData } from '@tanstack/react-query';
import { vi, t } from '@tripflix/i18n';
import {
  socialApi,
  useApiSession,
  useSocialPosts,
  usePostSearchFeed,
  updateReelSocialCache,
} from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { SocialIcon, ComposerModal, RightPanelCommentsSynchronized } from '../live-posts';
import { useHasUserInteracted } from '../use-has-user-interacted';
import { useSettledFlag } from '../use-settled-flag';
import { usePresence } from '../use-presence';
import { useIsWideScreen } from '../use-wide-screen';
import { nextScrollTarget, stepScrollTowards, wheelDeltaToPixels } from './smooth-wheel-scroll';
import reelsStyles from '../live-posts.module.css';
import { type FeedNavFilter } from './floating-nav-rail';
import { ItinerarySidebarPanel } from './itinerary-sidebar-panel';
import { PostCard } from './post-card';
import { getPostImages } from '../post-cover';
import styles from './social-feed.module.css';

export interface SocialFeedViewProps {
  /** Tab đang hiện. Tab được giữ mounted khi ẩn, nên hiện lại cũng là bố cục ban đầu: không chạy hiệu ứng. */
  isVisible?: boolean;
  initialKeyword?: string;
  /** Từ khoá đã chốt: tab chỉ hiện các bài viết trong kết quả tìm kiếm (dùng chung query với grid). */
  searchKeyword?: string;
  /** Bài vừa bấm từ grid kết quả: cuộn sẵn tới bài đó. */
  focusPostId?: string | null;
  onBackToResults?: () => void;
  isItineraryOpen?: boolean;
  onOpenItinerary?: () => void;
  onCloseItinerary?: () => void;
  filterMode?: FeedNavFilter;
  isComposerOpen?: boolean;
  onOpenComposer?: (type?: 'video' | 'vlog') => void;
  onCloseComposer?: () => void;
}

export function SocialFeedView({
  isVisible = true,
  initialKeyword = '',
  searchKeyword,
  focusPostId = null,
  onBackToResults,
  isItineraryOpen: propIsItineraryOpen,
  onOpenItinerary,
  onCloseItinerary,
  filterMode: propFilterMode,
  isComposerOpen: propIsComposerOpen,
  onOpenComposer,
  onCloseComposer,
}: SocialFeedViewProps) {
  const { user } = useApiSession();
  const client = useQueryClient();

  // Controlled or uncontrolled fallbacks
  const activeFilter = propFilterMode ?? 'all';

  const [localIsItineraryOpen, setLocalIsItineraryOpen] = useState(true);
  const isItineraryOpen = propIsItineraryOpen ?? localIsItineraryOpen;
  const handleOpenItinerary = onOpenItinerary ?? (() => setLocalIsItineraryOpen(true));
  const handleCloseItinerary = onCloseItinerary ?? (() => setLocalIsItineraryOpen(false));

  const [localIsComposerOpen, setLocalIsComposerOpen] = useState(false);
  const handleOpenComposer = onOpenComposer ?? (() => setLocalIsComposerOpen(true));
  const handleCloseComposer = onCloseComposer ?? (() => setLocalIsComposerOpen(false));

  // Layout states
  // Màn rộng mở sẵn panel bình luận; người dùng đóng/mở thì giữ lựa chọn đó. Server render coi như đóng để không lệch hydration.
  const isWideScreen = useIsWideScreen();
  const [rightOpenChoice, setIsRightOpen] = useState<boolean | null>(null);
  const isRightOpen = rightOpenChoice ?? isWideScreen;
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeFocusedPostId, setActiveFocusedPostId] = useState<string | null>(null);
  const [galleryState, setGalleryState] = useState<{ postId: string; index: number } | null>(null);

  const mainFeedRef = useRef<HTMLElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  // Optimistic UI states
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  const [optimisticSaves, setOptimisticSaves] = useState<Record<string, boolean>>({});

  // Query posts: useSocialPosts accepts 'public' | 'mine' | 'bookmarks'
  const effectiveKeyword = (searchKeyword !== undefined ? searchKeyword : initialKeyword).trim();
  const queryKind: 'public' | 'bookmarks' = activeFilter === 'saved' ? 'bookmarks' : 'public';
  const isSearchMode = activeFilter !== 'saved' && effectiveKeyword.length > 0;
  // Tab Bài viết chỉ lấy vlog; Reels có luồng riêng (/v1/feed).
  const feedQuery = useSocialPosts(queryKind, '', 'vlog', 'recommended');
  // Tìm kiếm: cùng query với grid kết quả (search của discovery) nên mở bài từ grid không gọi lại API.
  const searchQuery = usePostSearchFeed(isSearchMode ? effectiveKeyword : '');
  const postsQuery = isSearchMode ? searchQuery : feedQuery;

  const allPosts = useMemo(() => {
    const items: SocialPostDto[] = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
    // Kết quả tìm kiếm gộp cả Reels: tab này chỉ giữ bài viết.
    return isSearchMode ? items.filter((post) => post.postType === 'vlog') : items;
  }, [postsQuery.data, isSearchMode]);

  const posts = useMemo(() => {
    if (activeFilter === 'withTrip') {
      return allPosts.filter((post) => Boolean(post.tripAttachment));
    }
    return allPosts;
  }, [allPosts, activeFilter]);

  // Active focused post for Itinerary Sidebar
  const activeItineraryPost = useMemo(() => {
    if (activeFocusedPostId) {
      const match = posts.find((p) => p.id === activeFocusedPostId);
      if (match) return match;
    }
    if (activeCommentPostId) {
      const match = posts.find((p) => p.id === activeCommentPostId);
      if (match) return match;
    }
    return posts[0] ?? null;
  }, [activeFocusedPostId, activeCommentPostId, posts]);

  const activeItineraryCover = useMemo(() => {
    if (!activeItineraryPost) return undefined;
    return getPostImages({
      mediaIds: activeItineraryPost.mediaIds,
      destinationName: activeItineraryPost.tripAttachment?.destinationName,
      hotelName: activeItineraryPost.tripAttachment?.hotelName,
      title: activeItineraryPost.title,
      body: activeItineraryPost.body,
      hashtags: activeItineraryPost.hashtags,
      itineraryItems: activeItineraryPost.tripAttachment?.items,
    })[0]?.src;
  }, [activeItineraryPost]);

  // Image Gallery Lightbox state and helpers
  const activeGalleryPost = useMemo(() => {
    if (!galleryState) return null;
    return posts.find((p) => p.id === galleryState.postId) ?? null;
  }, [galleryState, posts]);

  const activeGalleryImages = useMemo(() => {
    if (!activeGalleryPost) return [];
    return getPostImages({
      mediaIds: activeGalleryPost.mediaIds,
      destinationName: activeGalleryPost.tripAttachment?.destinationName,
      hotelName: activeGalleryPost.tripAttachment?.hotelName,
      title: activeGalleryPost.title,
      body: activeGalleryPost.body,
      hashtags: activeGalleryPost.hashtags,
      itineraryItems: activeGalleryPost.tripAttachment?.items,
    });
  }, [activeGalleryPost]);

  useEffect(() => {
    if (!galleryState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setGalleryState(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setGalleryState((prev) => (prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setGalleryState((prev) =>
          prev
            ? { ...prev, index: Math.min(activeGalleryImages.length - 1, prev.index + 1) }
            : null,
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryState, activeGalleryImages.length]);

  // Active post for comment thread (dong bo style Reels)
  const activeCommentPost = useMemo(() => {
    if (activeCommentPostId) {
      const post = posts.find((p) => p.id === activeCommentPostId);
      if (post) {
        return {
          id: post.id,
          authorId: post.authorId,
          title: post.title,
          authorName: post.authorName,
          commentCount: post.commentCount,
          isVerified: post.isVerified,
        };
      }
    }
    const fallbackPost = (activeFocusedPostId ? posts.find((p) => p.id === activeFocusedPostId) : null) ?? posts[0];
    if (!fallbackPost) return null;
    return {
      id: fallbackPost.id,
      authorId: fallbackPost.authorId,
      title: fallbackPost.title,
      authorName: fallbackPost.authorName,
      commentCount: fallbackPost.commentCount,
      isVerified: fallbackPost.isVerified,
    };
  }, [activeCommentPostId, activeFocusedPostId, posts]);

  // Infinite scroll sentinel observer
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = postsQuery;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: mainFeedRef.current ?? null, rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mở bài từ grid kết quả: cuộn tới bài đó một lần khi tab đang hiện và bài đã có trong danh sách.
  const scrolledFocusIdRef = useRef<string | null>(null);
  const isFocusPostLoaded = Boolean(focusPostId) && posts.some((post) => post.id === focusPostId);
  useEffect(() => {
    if (!focusPostId) {
      scrolledFocusIdRef.current = null;
      return;
    }
    if (!isVisible || !isFocusPostLoaded || scrolledFocusIdRef.current === focusPostId) return;
    const container = mainFeedRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-feed-post-id="${CSS.escape(focusPostId)}"]`);
    if (!container || !target) return;
    scrolledFocusIdRef.current = focusPostId;
    container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
  }, [focusPostId, isVisible, isFocusPostLoaded]);

  // Viewport tracking for active comment post & itinerary post when scrolling feed
  useEffect(() => {
    const container = mainFeedRef.current;
    if (!container) return;

    const tickingRef = { current: false };

    const updateActivePost = () => {
      tickingRef.current = false;

      const postElements = container.querySelectorAll<HTMLElement>('[data-feed-post-id]');
      if (postElements.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      // Reading line: 35% from the top of the feed viewport
      const focusLine = containerRect.top + containerRect.height * 0.35;

      let bestPostId: string | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < postElements.length; i++) {
        const el = postElements[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        // Skip elements completely outside container viewport
        if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) {
          continue;
        }

        const id = el.getAttribute('data-feed-post-id');
        if (!id) continue;

        // If this post spans across the reading focus line, it is definitively the active post!
        if (rect.top <= focusLine && rect.bottom >= focusLine) {
          bestPostId = id;
          break;
        }

        // Fallback: post closest to the focus line
        const postCenter = rect.top + rect.height / 2;
        const dist = Math.abs(postCenter - focusLine);
        if (dist < minDistance) {
          minDistance = dist;
          bestPostId = id;
        }
      }

      if (bestPostId) {
        setActiveFocusedPostId(bestPostId);
        if (isRightOpen) {
          setActiveCommentPostId((prev) => (prev === bestPostId ? prev : bestPostId));
        }
      }
    };

    // Run initial detection
    updateActivePost();

    const handleScroll = () => {
      if (!tickingRef.current) {
        window.requestAnimationFrame(updateActivePost);
        tickingRef.current = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [posts, isRightOpen]);

  // Cho phep cuon danh sach bai viet ngay ca khi con tro chuot nam o vung trong ngoai the bai viet ("khuc ngoai")
  useEffect(() => {
    // Cuộn gốc của trình duyệt có hiệu ứng trượt; cộng thẳng scrollTop thì mỗi nấc chuột nhảy cóc.
    // Nên tự trượt về đích bằng requestAnimationFrame, lăn liên tục thì cộng dồn vào đích.
    const smooth = { target: null as number | null, frameId: 0 };
    const stopSmoothScroll = () => {
      if (smooth.frameId) window.cancelAnimationFrame(smooth.frameId);
      smooth.frameId = 0;
      smooth.target = null;
    };
    const runSmoothScroll = () => {
      const feedContainer = mainFeedRef.current;
      if (!feedContainer || smooth.target === null) {
        stopSmoothScroll();
        return;
      }
      const next = stepScrollTowards(feedContainer.scrollTop, smooth.target);
      if (next === null) {
        feedContainer.scrollTop = smooth.target;
        stopSmoothScroll();
        return;
      }
      feedContainer.scrollTop = next;
      smooth.frameId = window.requestAnimationFrame(runSmoothScroll);
    };

    const handleOuterWheel = (event: WheelEvent) => {
      const feedContainer = mainFeedRef.current;
      // Chi hoat dong khi feedContainer dang hien thi (khong bi an boi Reels)
      if (!feedContainer || feedContainer.offsetParent === null) {
        return;
      }

      const target = event.target as HTMLElement | null;

      // 1. Neu dang thao tac tren popup modal, dialog hoac o nhap van ban -> Giu nguyen mac dinh
      if (
        target?.closest('dialog, [role="dialog"]') ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      // 2. Neu con tro chuot dang nam trong cot Lich trinh (trai) hoac cot Binh luan (phai):
      // De 2 cot nay tu cuon noi dung rieng cua chung
      const isInsideLeftPanel = Boolean(
        target?.closest(`.${styles.itinerarySidebar}`) ||
        target?.closest(`.${styles.itineraryInFeed}`)
      );
      const isInsideRightPanel = Boolean(
        target?.closest(`.${reelsStyles.rightPanel}`) ||
        target?.closest(`.${styles.rightPanelInFeed}`)
      );

      if (isInsideLeftPanel || isInsideRightPanel) {
        return;
      }

      // 3. Neu con tro chuot da nam truc tiep ben trong mainFeedColumn:
      // Trinh duyet tu dong cuon tu nhien
      if (feedContainer.contains(target)) {
        // Người dùng cuộn trực tiếp trong bảng tin: bỏ đích trượt cũ để không giằng co với cuộn gốc.
        stopSmoothScroll();
        return;
      }

      // 4. Neu con tro chuot nam o "khuc ngoai" (khoang trong giua cac cot, dock, padding, background):
      // Chuyen huong cuon vao mainFeedColumn tuong tu nhu ben Reels
      event.preventDefault();

      smooth.target = nextScrollTarget({
        pendingTarget: smooth.target,
        scrollTop: feedContainer.scrollTop,
        delta: wheelDeltaToPixels(event.deltaY, event.deltaMode, feedContainer.clientHeight),
        maxScroll: feedContainer.scrollHeight - feedContainer.clientHeight,
      });
      if (!smooth.frameId) smooth.frameId = window.requestAnimationFrame(runSmoothScroll);
    };

    window.addEventListener('wheel', handleOuterWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleOuterWheel);
      stopSmoothScroll();
    };
  }, []);

  const loginReturnHref = typeof window !== 'undefined'
    ? `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
    : '/login';

  // Like / Save mutations
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
      return socialApi.sharePost(payload.postId);
    },
    onMutate: async (payload) => {
      if (payload.type === 'like' && payload.nextSelected !== undefined) {
        const prevLiked = optimisticLikes[payload.postId];
        setOptimisticLikes((prev) => ({ ...prev, [payload.postId]: payload.nextSelected! }));

        // Cap nhat truc tiep so reactionTotal vao React Query cache cua danh sach bai viet
        client.setQueriesData<InfiniteData<{ items: SocialPostDto[] }>>({ queryKey: ['social'] }, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== payload.postId) return item;
                const delta = payload.nextSelected ? 1 : -1;
                return {
                  ...item,
                  reactionTotal: Math.max(0, item.reactionTotal + delta),
                  viewerContext: {
                    myReaction: payload.nextSelected ? 'like' : null,
                    isBookmarked: item.viewerContext?.isBookmarked ?? false,
                  },
                };
              }),
            })),
          };
        });

        const rollbackCache = user
          ? updateReelSocialCache(client, user.id, payload.postId, 'like', payload.nextSelected)
          : undefined;
        return { rollbackLike: () => {
          setOptimisticLikes((prev) => {
            const next = { ...prev };
            if (prevLiked !== undefined) {
              next[payload.postId] = prevLiked;
            } else {
              delete next[payload.postId];
            }
            return next;
          });
          rollbackCache?.();
          void client.invalidateQueries({ queryKey: ['social'] });
        }};
      }
      if (payload.type === 'save' && payload.nextSelected !== undefined) {
        const prevSaved = optimisticSaves[payload.postId];
        setOptimisticSaves((prev) => ({ ...prev, [payload.postId]: payload.nextSelected! }));

        // Cap nhat truc tiep so bookmarkCount vao React Query cache cua danh sach bai viet
        client.setQueriesData<InfiniteData<{ items: SocialPostDto[] }>>({ queryKey: ['social'] }, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== payload.postId) return item;
                const delta = payload.nextSelected ? 1 : -1;
                return {
                  ...item,
                  bookmarkCount: Math.max(0, item.bookmarkCount + delta),
                  viewerContext: {
                    myReaction: item.viewerContext?.myReaction ?? null,
                    isBookmarked: Boolean(payload.nextSelected),
                  },
                };
              }),
            })),
          };
        });

        const rollbackCache = user
          ? updateReelSocialCache(client, user.id, payload.postId, 'save', payload.nextSelected)
          : undefined;
        return { rollbackSave: () => {
          setOptimisticSaves((prev) => {
            const next = { ...prev };
            if (prevSaved !== undefined) {
              next[payload.postId] = prevSaved;
            } else {
              delete next[payload.postId];
            }
            return next;
          });
          rollbackCache?.();
          void client.invalidateQueries({ queryKey: ['social'] });
        }};
      }
      return {};
    },
    onSuccess: (data: { reactionTotal?: number; myReaction?: 'like' | null; bookmarkCount?: number; isBookmarked?: boolean } | unknown, payload) => {
      const responseData = data as { reactionTotal?: number; myReaction?: 'like' | null; bookmarkCount?: number; isBookmarked?: boolean } | undefined;
      if (payload.type === 'like' && responseData?.reactionTotal !== undefined) {
        client.setQueriesData<InfiniteData<{ items: SocialPostDto[] }>>({ queryKey: ['social'] }, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== payload.postId) return item;
                return {
                  ...item,
                  reactionTotal: responseData.reactionTotal!,
                  viewerContext: {
                    myReaction: responseData.myReaction ?? (payload.nextSelected ? 'like' : null),
                    isBookmarked: item.viewerContext?.isBookmarked ?? false,
                  },
                };
              }),
            })),
          };
        });
      }
      if (payload.type === 'save' && responseData?.bookmarkCount !== undefined) {
        client.setQueriesData<InfiniteData<{ items: SocialPostDto[] }>>({ queryKey: ['social'] }, (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== payload.postId) return item;
                return {
                  ...item,
                  bookmarkCount: responseData.bookmarkCount!,
                  viewerContext: {
                    myReaction: item.viewerContext?.myReaction ?? null,
                    isBookmarked: Boolean(responseData.isBookmarked ?? payload.nextSelected),
                  },
                };
              }),
            })),
          };
        });
      }
    },
    onError: (_err, _vars, context) => {
      context?.rollbackLike?.();
      context?.rollbackSave?.();
    },
    onSettled: (_data, _error, payload) => {
      if (payload?.postId) {
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
      }
      // Feed gợi ý đã cập nhật lượt thích tại chỗ; tải lại sẽ bỏ bài vừa thích và xô các bài bên dưới.
      void client.invalidateQueries({ queryKey: ['social'], predicate: (q) => q.queryKey[5] !== 'recommended' });
    },
  });

  const handleLikeToggle = useCallback((postId: string, next: boolean) => {
    if (!user) {
      window.location.href = loginReturnHref;
      return;
    }
    engagementMutation.mutate({
      postId,
      type: 'like',
      nextSelected: next,
    });
  }, [user, loginReturnHref, engagementMutation]);

  const handleSaveToggle = useCallback((postId: string, next: boolean) => {
    if (!user) {
      window.location.href = loginReturnHref;
      return;
    }
    engagementMutation.mutate({
      postId,
      type: 'save',
      nextSelected: next,
    });
  }, [user, loginReturnHref, engagementMutation]);

  const handleShare = useCallback(async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    const shareUrl = `${window.location.origin}/trips/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post?.title ?? 'Tripflix Inspiration',
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Bo qua neu nguoi dung dong hop thoai chia se
    }
    engagementMutation.mutate({
      postId,
      type: 'share',
    });
  }, [posts, engagementMutation]);

  const handleToggleComment = useCallback(
    (postId: string) => {
      const currentActiveId = activeCommentPostId ?? activeCommentPost?.id;
      if (isRightOpen && currentActiveId === postId) {
        // Neu dang mo dung bai viet nay -> Dong lai
        setIsRightOpen(false);
        return;
      }

      // Neu dang dong hoac dang mo bai khac -> Mo panel va tai moi binh luan
      setActiveCommentPostId(postId);
      setIsRightOpen(true);
      void client.invalidateQueries({ queryKey: ['social', 'comments', postId] });
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 80);
    },
    [client, isRightOpen, activeCommentPostId, activeCommentPost?.id]
  );

  // Layout container class selection
  const isLeftVisible = isItineraryOpen;
  const isRightVisible = isRightOpen;
  // Giữ sidebar thêm một nhịp khi đóng để chạy hiệu ứng thoát, song song với cột lưới co lại.
  // Chưa thao tác thì bố cục mặc định hiện ngay, không chạy hiệu ứng trượt/co giãn.
  const hasUserInteracted = useHasUserInteracted();
  const isLayoutSettled = useSettledFlag(isVisible);
  const isLayoutAnimated = hasUserInteracted && isLayoutSettled;
  // Chỉ những lần mở sau khi người dùng đã thao tác mới có hiệu ứng trượt vào.
  const leftPresence = usePresence(isLeftVisible, { shouldAnimateEnter: isLayoutAnimated });
  const rightPresence = usePresence(isRightVisible, { shouldAnimateEnter: isLayoutAnimated });

  const containerClassName =
    isLeftVisible && isRightVisible
      ? styles.splitViewContainer
      : !isLeftVisible && isRightVisible
      ? `${styles.splitViewContainer} ${styles.splitViewNoLeft}`
      : isLeftVisible && !isRightVisible
      ? `${styles.splitViewContainer} ${styles.splitViewNoRight}`
      : `${styles.splitViewContainer} ${styles.splitViewCenterOnly}`;

  return (
    <div className={`${containerClassName} ${isLayoutAnimated ? '' : styles.layoutStatic}`}>
      {/* 1. Left Column: Itinerary Sidebar Panel (Nằm ngay bên phải của Dock, cố định vững vàng) */}
      {leftPresence.isRendered && (
        <ItinerarySidebarPanel
          className={`${styles.itineraryInFeed} ${leftPresence.isEnterAnimated ? styles.sidebarEnterLeft : ''} ${
            leftPresence.isClosing ? styles.sidebarClosingLeft : ''
          }`}
          trip={activeItineraryPost?.tripAttachment}
          postTitle={activeItineraryPost?.title}
          hashtags={activeItineraryPost?.hashtags}
          coverImage={activeItineraryCover}
          isOpen={leftPresence.isRendered}
          onClose={handleCloseItinerary}
        />
      )}

      {/* 2. Center Column: Main Social Feed (Cuộn mượt độc lập) */}
      <main ref={mainFeedRef} className={styles.mainFeedColumn} aria-label="Bảng tin du lịch">
        {isSearchMode && onBackToResults && (
          <div className={styles.searchBackBar}>
            <button type="button" className={styles.searchBackButton} onClick={onBackToResults}>
              <SocialIcon name="chevronLeft" size={16} />
              {vi.api.searchResultsBack}
            </button>
            <span className={styles.searchBackKeyword}>“{effectiveKeyword}”</span>
          </div>
        )}

        {/* Quick Post Composer Card (FB/LinkedIn 2-Row Style) */}
        <div className={styles.composerCard} style={isSearchMode ? { display: 'none' } : undefined}>
          {/* Row 1: User Avatar + Pill Input */}
          <div className={styles.composerTopRow}>
            <div className={styles.composerAvatar}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              type="button"
              className={styles.composerInputPill}
              onClick={() => {
                if (!user) {
                  window.location.href = loginReturnHref;
                  return;
                }
                handleOpenComposer('vlog');
              }}
            >
              Chia sẻ trải nghiệm, kinh nghiệm du lịch của bạn...
            </button>
          </div>

          {/* Row 2: Action Shortcuts + Submit Button */}
          <div className={styles.composerBottomRow}>
            <div className={styles.composerActionGroup}>
              {/* 1. Anh/Video */}
              <button
                type="button"
                className={styles.composerTagBtn}
                title="Đăng ảnh hoặc video"
                onClick={() => {
                  if (!user) {
                    window.location.href = loginReturnHref;
                    return;
                  }
                  handleOpenComposer('vlog');
                }}
              >
                <span className={styles.composerTagIconMedia} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </span>
                <span>Ảnh/Video</span>
              </button>

              {/* 2. Gan chuyen di */}
              <button
                type="button"
                className={styles.composerTagBtn}
                title="Đính kèm lịch trình chuyến đi"
                onClick={() => {
                  if (!user) {
                    window.location.href = loginReturnHref;
                    return;
                  }
                  handleOpenComposer('vlog');
                }}
              >
                <span className={styles.composerTagIconTrip} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <span>Gắn chuyến đi</span>
              </button>

              {/* 3. Hashtag */}
              <button
                type="button"
                className={styles.composerTagBtn}
                title="Thêm hashtag chủ đề"
                onClick={() => {
                  if (!user) {
                    window.location.href = loginReturnHref;
                    return;
                  }
                  handleOpenComposer('vlog');
                }}
              >
                <span className={styles.composerTagIconHash} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="9" y2="9"/>
                    <line x1="4" x2="20" y1="15" y2="15"/>
                    <line x1="10" x2="8" y1="3" y2="21"/>
                    <line x1="16" x2="14" y1="3" y2="21"/>
                  </svg>
                </span>
                <span>Hashtag</span>
              </button>
            </div>

            {/* Right: Nut Dang bai */}
            <button
              type="button"
              className={styles.composerSubmitBtn}
              onClick={() => {
                if (!user) {
                  window.location.href = loginReturnHref;
                  return;
                }
                handleOpenComposer('vlog');
              }}
            >
              Đăng bài
            </button>
          </div>
        </div>

        {/* Loading state */}
        {postsQuery.isPending && (
          <div className={styles.emptyFeed}>
            <span className="small muted">Đang tải bảng tin cảm hứng...</span>
          </div>
        )}

        {/* Error state */}
        {postsQuery.isError && (
          <div className={styles.emptyFeed}>
            <div className={styles.emptyFeedTitle}>Không thể tải bài viết</div>
            <p className={styles.emptyFeedDesc}>Đã xảy ra lỗi khi kết nối đến máy chủ.</p>
            <button
              type="button"
              className={styles.emptyFeedAction}
              onClick={() => void postsQuery.refetch()}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!postsQuery.isPending && !postsQuery.isError && posts.length === 0 && (
          <div className={styles.emptyFeed}>
            <div className={styles.emptyFeedTitle}>Chưa có bài viết nào</div>
            <p className={styles.emptyFeedDesc}>
              {activeFilter === 'saved'
                ? 'Bạn chưa lưu bài viết nào. Hãy khám phá và lưu lại những bài viết bạn yêu thích.'
                : 'Chưa có bài viết nào phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        )}

        {/* Posts list */}
        {posts.map((post) => (
          <div key={post.id} data-feed-post-id={post.id}>
            <PostCard
              post={post}
              currentUser={user}
              isLiked={
                optimisticLikes[post.id] ??
                (post.viewerContext?.myReaction !== null && post.viewerContext?.myReaction !== undefined)
              }
              isSaved={optimisticSaves[post.id] ?? Boolean(post.viewerContext?.isBookmarked)}
              isCommentActive={activeCommentPost?.id === post.id && isRightOpen}
              onToggleLike={handleLikeToggle}
              onToggleSave={handleSaveToggle}
              onToggleComment={handleToggleComment}
              onShare={handleShare}
              onViewItinerary={(postId) => {
                setActiveFocusedPostId(postId);
                handleOpenItinerary();
              }}
              onOpenGallery={(postId, imgIdx) => {
                setGalleryState({ postId, index: imgIdx });
              }}
            />
          </div>
        ))}

        {/* Infinite Scroll trigger */}
        <div ref={sentinelRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {postsQuery.isFetchingNextPage && (
            <span className="small muted">Đang tải thêm bài viết...</span>
          )}
        </div>
      </main>

      {/* 3. Right Column: Comment Sidebar (Dùng chung 1 style đồng bộ chuẩn Reels) */}
      {rightPresence.isRendered && (
        <aside
          className={`${reelsStyles.rightPanel} ${styles.rightPanelInFeed} ${
            rightPresence.isEnterAnimated ? styles.sidebarEnterRight : ''
          } ${rightPresence.isClosing ? styles.sidebarClosingRight : ''}`}
          aria-label={vi.api.commentPanelAria}
        >
          <div className={reelsStyles.panelHeaderBar}>
            <h2 className={reelsStyles.panelHeaderTitle}>
              <span className={reelsStyles.panelHeaderIcon}>
                <SocialIcon name="comment" size={16} />
              </span>
              <span>
                {t('api.commentPanelTabComments', {
                  count: activeCommentPost?.commentCount ?? 0,
                })}
              </span>
            </h2>

            <button
              type="button"
              className={reelsStyles.iconGhostBtn}
              aria-label={vi.api.commentPanelClose}
              title={vi.api.commentPanelClose}
              onClick={() => {
                setIsRightOpen(false);
              }}
            >
              <SocialIcon name="close" size={17} />
            </button>
          </div>

          {activeCommentPost ? (
            <RightPanelCommentsSynchronized
              key={activeCommentPost.id}
              post={activeCommentPost}
              loginHref={loginReturnHref}
              scrollContainerRef={rightScrollRef}
              composerInputRef={commentInputRef}
            />
          ) : (
            <div className={styles.emptyCommentsNotice}>
              <div className={styles.emptyCommentsIcon}>
                <SocialIcon name="comment" size={32} />
              </div>
              <p className={styles.emptyCommentsText}>
                Chọn biểu tượng bình luận trên bài viết để xem và thảo luận
              </p>
            </div>
          )}
        </aside>
      )}



      {/* Composer Modal for Creating / Drafting Posts (Rendered locally only when uncontrolled) */}
      {propIsComposerOpen === undefined && localIsComposerOpen && user && (
        <ComposerModal
          initialView="compose"
          initialPostType="vlog"
          onClose={handleCloseComposer}
        />
      )}

      {/* 4. In-Feed Image Gallery Lightbox Modal */}
      {galleryState && activeGalleryPost && activeGalleryImages[galleryState.index] && (() => {
        const currentImg = activeGalleryImages[galleryState.index];
        if (!currentImg) return null;
        return (
          <dialog
            open
            className={reelsStyles.galleryStageOverlay}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              margin: 0,
              padding: 0,
              border: 'none',
              width: '100%',
              height: '100%',
              maxWidth: 'none',
              maxHeight: 'none',
              background: 'color-mix(in srgb, var(--color-ink) 92%, transparent)',
            }}
            aria-modal="true"
            aria-label={activeGalleryPost.title}
          >
            <div className={reelsStyles.galleryTopBar}>
              <span className={reelsStyles.galleryCountPill}>
                {galleryState.index + 1} / {activeGalleryImages.length}
              </span>
              <button
                type="button"
                className={reelsStyles.galleryCloseBtn}
                aria-label={vi.api.immersiveCloseGallery}
                title={vi.api.immersiveCloseGallery}
                onClick={() => setGalleryState(null)}
              >
                <SocialIcon name="close" size={18} />
              </button>
            </div>

            <div className={reelsStyles.galleryContainFrame}>
              <Image
                key={currentImg.src}
                src={currentImg.src}
                alt={activeGalleryPost.title}
                fill
                className={reelsStyles.galleryContainImg}
                sizes="100vw"
                priority
                unoptimized={currentImg.src.startsWith('http')}
              />
            </div>

            {activeGalleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${reelsStyles.gallerySlideNavBtn} ${reelsStyles.gallerySlidePrev}`}
                  disabled={galleryState.index <= 0}
                  aria-label={vi.api.immersivePrevSlide}
                  title={vi.api.immersivePrevSlide}
                  onClick={() =>
                    setGalleryState((prev) =>
                      prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null,
                    )
                  }
                >
                  <SocialIcon name="chevronLeft" size={20} />
                </button>
                <button
                  type="button"
                  className={`${reelsStyles.gallerySlideNavBtn} ${reelsStyles.gallerySlideNext}`}
                  disabled={galleryState.index >= activeGalleryImages.length - 1}
                  aria-label={vi.api.immersiveNextSlide}
                  title={vi.api.immersiveNextSlide}
                  onClick={() =>
                    setGalleryState((prev) =>
                      prev ? { ...prev, index: Math.min(activeGalleryImages.length - 1, prev.index + 1) } : null,
                    )
                  }
                >
                  <SocialIcon name="chevronRight" size={20} />
                </button>
              </>
            )}
          </dialog>
        );
      })()}
    </div>
  );
}
