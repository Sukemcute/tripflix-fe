'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { vi, t } from '@tripflix/i18n';
import {
  socialApi,
  useApiSession,
  useSocialPosts,
  updateReelSocialCache,
} from '@tripflix/api-client';
import { SocialIcon, ComposerModal, RightPanelCommentsSynchronized } from '../live-posts';
import reelsStyles from '../live-posts.module.css';
import { type FeedNavFilter } from './floating-nav-rail';
import { ItinerarySidebarPanel } from './itinerary-sidebar-panel';
import { PostCard } from './post-card';
import { getPostImages } from '../post-cover';
import styles from './social-feed.module.css';

export interface SocialFeedViewProps {
  initialKeyword?: string;
  searchKeyword?: string;
  isItineraryOpen?: boolean;
  onOpenItinerary?: () => void;
  onCloseItinerary?: () => void;
  filterMode?: FeedNavFilter;
  isComposerOpen?: boolean;
  onOpenComposer?: (type?: 'video' | 'vlog') => void;
  onCloseComposer?: () => void;
}

export function SocialFeedView({
  initialKeyword = '',
  searchKeyword,
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
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeFocusedPostId, setActiveFocusedPostId] = useState<string | null>(null);
  const isCommentPinnedRef = useRef(false);

  const mainFeedRef = useRef<HTMLElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  // Optimistic UI states
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  const [optimisticSaves, setOptimisticSaves] = useState<Record<string, boolean>>({});

  // Query posts: useSocialPosts accepts 'public' | 'mine' | 'bookmarks'
  const effectiveKeyword = (searchKeyword !== undefined ? searchKeyword : initialKeyword).trim();
  const queryKind: 'public' | 'bookmarks' = activeFilter === 'saved' ? 'bookmarks' : 'public';
  const postsQuery = useSocialPosts(queryKind, activeFilter === 'saved' ? '' : effectiveKeyword);

  const allPosts = useMemo(() => {
    return postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [postsQuery.data]);

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
    return posts.find((p) => Boolean(p.tripAttachment)) ?? posts[0] ?? null;
  }, [activeFocusedPostId, posts]);

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

  // Suggested trip from another post if current doesn't have one
  const suggestedTripPost = useMemo(() => {
    const postWithTrip = posts.find(
      (p) => p.id !== activeItineraryPost?.id && Boolean(p.tripAttachment)
    );
    if (!postWithTrip || !postWithTrip.tripAttachment) return null;
    return {
      title: postWithTrip.title,
      trip: postWithTrip.tripAttachment,
      coverImage: getPostImages({
        mediaIds: postWithTrip.mediaIds,
        destinationName: postWithTrip.tripAttachment.destinationName,
        hotelName: postWithTrip.tripAttachment.hotelName,
        title: postWithTrip.title,
        body: postWithTrip.body,
        hashtags: postWithTrip.hashtags,
        itineraryItems: postWithTrip.tripAttachment.items,
      })[0]?.src,
    };
  }, [activeItineraryPost, posts]);

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

  // Viewport tracking for active comment post & itinerary post when scrolling feed
  useEffect(() => {
    const container = mainFeedRef.current;
    if (!container) return;

    const tickingRef = { current: false };

    const updateActivePost = () => {
      tickingRef.current = false;
      const activeElem = document.activeElement;
      const isUserTyping = activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA');
      if (isUserTyping) return;

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
        const post = posts.find((p) => p.id === bestPostId);
        if (post?.tripAttachment) {
          setActiveFocusedPostId(bestPostId);
        }
        if (!isCommentPinnedRef.current) {
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
  }, [posts]);

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
        }};
      }
      if (payload.type === 'save' && payload.nextSelected !== undefined) {
        const prevSaved = optimisticSaves[payload.postId];
        setOptimisticSaves((prev) => ({ ...prev, [payload.postId]: payload.nextSelected! }));
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
        }};
      }
      return {};
    },
    onError: (_err, _vars, context) => {
      context?.rollbackLike?.();
      context?.rollbackSave?.();
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['social'] });
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

  const handleOpenComment = useCallback((postId: string) => {
    isCommentPinnedRef.current = true;
    setActiveCommentPostId(postId);
    setIsRightOpen(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 80);
  }, []);

  // Layout container class selection
  const isLeftVisible = isItineraryOpen;
  const isRightVisible = isRightOpen;

  const containerClassName =
    isLeftVisible && isRightVisible
      ? styles.splitViewContainer
      : !isLeftVisible && isRightVisible
      ? `${styles.splitViewContainer} ${styles.splitViewNoLeft}`
      : isLeftVisible && !isRightVisible
      ? `${styles.splitViewContainer} ${styles.splitViewNoRight}`
      : `${styles.splitViewContainer} ${styles.splitViewCenterOnly}`;

  return (
    <div className={containerClassName}>
      {/* 1. Left Column: Itinerary Sidebar Panel (Nằm ngay bên phải của Dock, cố định vững vàng) */}
      {isLeftVisible && (
        <ItinerarySidebarPanel
          className={styles.itineraryInFeed}
          trip={activeItineraryPost?.tripAttachment}
          postTitle={activeItineraryPost?.title}
          hashtags={activeItineraryPost?.hashtags}
          coverImage={activeItineraryCover}
          isOpen={isLeftVisible}
          onClose={handleCloseItinerary}
          suggestedTripPost={suggestedTripPost}
          onSelectSuggestedTrip={() => {
            if (suggestedTripPost) {
              const matched = posts.find((p) => p.title === suggestedTripPost.title);
              if (matched) setActiveFocusedPostId(matched.id);
            }
          }}
        />
      )}

      {/* 2. Center Column: Main Social Feed (Cuộn mượt độc lập) */}
      <main ref={mainFeedRef} className={styles.mainFeedColumn} aria-label="Bảng tin du lịch">
        {/* Quick Post Composer Card (FB/LinkedIn 2-Row Style) */}
        <div className={styles.composerCard}>
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
              isLiked={optimisticLikes[post.id] ?? false}
              isSaved={optimisticSaves[post.id] ?? false}
              isCommentActive={activeCommentPostId === post.id && isRightOpen}
              onToggleLike={handleLikeToggle}
              onToggleSave={handleSaveToggle}
              onToggleComment={handleOpenComment}
              onShare={handleShare}
              onViewItinerary={(postId) => {
                setActiveFocusedPostId(postId);
                handleOpenItinerary();
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
      {isRightOpen && (
        <aside
          className={`${reelsStyles.rightPanel} ${styles.rightPanelInFeed}`}
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
                isCommentPinnedRef.current = false;
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

      {/* Reopen Floating Button when right panel is closed */}
      {!isRightOpen && (
        <button
          type="button"
          className={styles.reopenContextBtn}
          title="Mở bình luận"
          aria-label="Mở bình luận"
          onClick={() => setIsRightOpen(true)}
        >
          <SocialIcon name="comment" size={20} />
        </button>
      )}

      {/* Composer Modal for Creating / Drafting Posts (Rendered locally only when uncontrolled) */}
      {propIsComposerOpen === undefined && localIsComposerOpen && user && (
        <ComposerModal
          initialView="compose"
          initialPostType="vlog"
          onClose={handleCloseComposer}
        />
      )}
    </div>
  );
}
