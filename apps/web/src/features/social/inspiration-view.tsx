'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { socialApi, useApiSession } from '@tripflix/api-client';
import { useQuery } from '@tanstack/react-query';
import { validateInspirationKeyword } from '@/features/discovery/inspiration-keyword';
import { InstagramLeftDock } from './feed/instagram-left-dock';
import type { FeedNavFilter } from './feed/floating-nav-rail';
import { SocialFeedView } from './feed/social-feed-view';
import { SearchResultsGrid } from './search-results-grid';
import { pushRecentSearch, readRecentSearches, writeRecentSearches } from './recent-searches';
import {
  buildInspirationHref,
  parseSearchResultType,
  parseSearchSort,
  SEARCH_OPEN_KIND_PARAM,
  SEARCH_COMMENT_PARAM,
  SEARCH_OPEN_PARAM,
  SEARCH_QUERY_PARAM,
  SEARCH_SORT_PARAM,
  SEARCH_TYPE_PARAM,
  type InspirationUrlChanges,
  type SearchResultType,
  type SearchSort,
} from './search-url';
import { useIsPinnedItineraryScreen, useIsWideScreen } from './use-wide-screen';
import { resolveTabItineraryOpen } from './feed/itinerary-pin';
import { COMPOSE_PARAM, readComposeType, removeComposeParam, type ComposeType } from '@/features/shell/mobile-tabs';
import { PublishToast } from './composer/publish-toast';
import styles from './feed/social-feed.module.css';

const InspirationImmersiveViewer = dynamic(
  () => import('./live-posts').then((m) => m.InspirationImmersiveViewer),
  { ssr: false },
);

const ComposerModal = dynamic(
  () => import('./live-posts').then((m) => m.ComposerModal),
  { ssr: false },
);

export function InspirationView() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = document.querySelector('.ota-header');
    const page = pageRef.current;
    if (!header || !page) return;
    // Đặt ở thẻ gốc để #content (globals.css) và khung trang dùng chung một số đo; lệch nhau là trang dài lố,
    // đáy trang lộ một dải nền và panel bị cắt ngang. Đo mép dưới header cộng lề dưới, đúng với mọi kiểu header.
    const root = document.documentElement;
    const updateHeight = () => {
      const marginBottom = Number.parseFloat(getComputedStyle(header).marginBottom) || 0;
      root.style.setProperty('--feed-header-height', `${Math.ceil(header.getBoundingClientRect().bottom + marginBottom)}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--feed-header-height');
    };
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isReady } = useApiSession();

  // Tinh toan che do xem truc tiep tu URL query param (?view=posts hoac ?view=reels)
  const viewParam = searchParams.get('view');
  const openPostId = searchParams.get(SEARCH_OPEN_PARAM) || null;
  const isOpenReel = searchParams.get(SEARCH_OPEN_KIND_PARAM) === 'reel';
  const focusCommentId = searchParams.get(SEARCH_COMMENT_PARAM) || undefined;
  const activeView: 'posts' | 'reels' = (viewParam === 'reels' && !openPostId) || (openPostId && isOpenReel) ? 'reels' : 'posts';

  // Tìm kiếm theo URL (?q= từ khoá đã chốt, ?open= bài mở từ grid) để F5 và nút Back giữ đúng chỗ.
  const rawKeyword = searchParams.get(SEARCH_QUERY_PARAM) ?? '';
  const searchKeyword = rawKeyword ? validateInspirationKeyword(rawKeyword).keyword : '';
  const isSearching = searchKeyword.length > 0;
  const searchResultType = parseSearchResultType(searchParams.get(SEARCH_TYPE_PARAM));
  // Grid và bài mở từ grid dùng chung kiểu sắp xếp (cùng query tìm), nên cuộn trong bài đúng thứ tự grid đang hiện.
  const searchSort = parseSearchSort(searchParams.get(SEARCH_SORT_PARAM));
  const isSearchGrid = isSearching && !openPostId;
  // Reel mở từ grid (?kind=reel) xem trong trình xem Reels, lướt trong các Reel của kết quả.
  const isSearchReelOpen = isSearching && Boolean(openPostId) && isOpenReel;
  // Đang tìm thì bảng tin Reels tạm ẩn: kết quả hiện ở grid, bài viết mở ở tab Bài viết.
  const isReels = (activeView === 'reels' && !isSearching) || isSearchReelOpen;
  const isPostsVisible = !isReels && !isSearchGrid;
  const hasOpenedFromGridRef = useRef(false);
  // Danh sách Reel của grid lúc bấm; vào thẳng link (F5) thì chưa có, chỉ xem đúng Reel trong URL.
  const [gridReelIds, setGridReelIds] = useState<string[] | null>(null);
  const searchReelIds = isSearchReelOpen && openPostId ? (gridReelIds ?? [openPostId]) : undefined;
  // Link chia sẻ Reel (?open=<id>&kind=reel, không có từ khoá): Reel đó lên đầu bảng tin Reels.
  const sharedReelId = !isSearching && openPostId && isOpenReel ? openPostId : null;

  // Trạng thái Lịch trình tách riêng giữa Bài viết và Reels:
  // - Bài viết >= 1200px luôn ghim cố định cột Lịch trình; 1024..1199px mở sẵn và đóng/mở được; < 1024px đóng sẵn (bottom sheet).
  // - Reels mặc định đóng để khung video rộng và vẫn đóng/mở độc lập không ảnh hưởng tab Bài viết.
  const isWideScreen = useIsWideScreen();
  const isPinnedScreen = useIsPinnedItineraryScreen();
  const [postsItineraryChoice, setPostsItineraryChoice] = useState<boolean | null>(null);
  const [reelsItineraryChoice, setReelsItineraryChoice] = useState<boolean | null>(null);
  const isPostsItineraryOpen = resolveTabItineraryOpen({
    view: 'posts',
    isWideScreen,
    isPinnedWidth: isPinnedScreen,
    postsChoice: postsItineraryChoice,
    reelsChoice: reelsItineraryChoice,
  });
  const isReelsItineraryOpen = resolveTabItineraryOpen({
    view: 'reels',
    isWideScreen,
    isPinnedWidth: isPinnedScreen,
    postsChoice: postsItineraryChoice,
    reelsChoice: reelsItineraryChoice,
  });
  const activeItineraryOpen = isReels ? isReelsItineraryOpen : isPostsItineraryOpen;
  const handleToggleActiveItinerary = useCallback(() => {
    if (isReels) {
      setReelsItineraryChoice(!isReelsItineraryOpen);
      return;
    }
    if (!isPinnedScreen) {
      setPostsItineraryChoice(!isPostsItineraryOpen);
    }
  }, [isReels, isReelsItineraryOpen, isPinnedScreen, isPostsItineraryOpen]);
  const [filterMode, setFilterMode] = useState<FeedNavFilter>('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerPostType, setComposerPostType] = useState<'video' | 'vlog'>('vlog');
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null);

  const navigate = useCallback(
    (changes: InspirationUrlChanges, mode: 'push' | 'replace') => {
      const href = buildInspirationHref(pathname, searchParams, changes);
      if (mode === 'push') router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Link mở thẳng một bài (/trips/<id> cũ, thông báo, admin) không biết loại bài: cùng cache với bảng tin.
  const isDirectOpen = Boolean(openPostId) && !isSearching;
  const directPostQuery = useQuery({
    queryKey: ['social', 'post', openPostId, user?.id],
    enabled: isReady && isDirectOpen,
    queryFn: ({ signal }) => socialApi.getPost(openPostId!, signal),
    retry: false,
  });
  const directPost = isDirectOpen && directPostQuery.data?.post.id === openPostId ? directPostQuery.data.post : null;
  useEffect(() => {
    if (!directPost) return;
    if (directPost.status === 'draft' && directPost.authorId === user?.id) {
      // Nháp không hiện ở bảng tin: mở khung soạn bài để sửa, đăng hoặc xoá.
      setComposerDraftId(directPost.id);
      setComposerPostType(directPost.postType === 'video' ? 'video' : 'vlog');
      setIsComposerOpen(true);
      navigate({ openPostId: null }, 'replace');
    } else if (directPost.postType === 'video' && !isOpenReel) {
      navigate({ openPostId: directPost.id, isOpenReel: true }, 'replace');
    }
  }, [directPost, user?.id, isOpenReel, navigate]);

  // Chọn tab trên dock thì thoát tìm kiếm.
  const handleSelectView = useCallback(
    (nextView: 'posts' | 'reels') => {
      navigate({ view: nextView, keyword: null }, isSearching ? 'push' : 'replace');
    },
    [navigate, isSearching]
  );

  const handleSelectFilter = useCallback(
    (nextFilter: FeedNavFilter) => {
      setFilterMode(nextFilter);
      // Ở Reels thì handleSelectView đã thoát tìm kiếm; replace để hai lần gọi liền nhau chỉ thêm một mục lịch sử.
      if ((isSearching || openPostId) && activeView === 'posts') navigate({ keyword: null }, 'replace');
    },
    [navigate, isSearching, openPostId, activeView]
  );

  const handleSubmitSearch = useCallback(
    (keyword: string) => {
      setFilterMode('all');
      hasOpenedFromGridRef.current = false;
      // Mọi đường tìm (Enter, chip, hashtag trên Reels) đều đi qua đây nên ghi "Tìm gần đây" một chỗ.
      if (keyword.trim()) writeRecentSearches(pushRecentSearch(readRecentSearches(), keyword));
      navigate({ keyword }, 'push');
    },
    [navigate]
  );

  // Đổi tab kết quả: replace để Back không phải đi qua từng tab đã bấm.
  const handleChangeResultType = useCallback(
    (resultType: SearchResultType) => navigate({ resultType }, 'replace'),
    [navigate]
  );

  // Đổi kiểu sắp xếp: replace như đổi tab.
  const handleChangeSort = useCallback((sort: SearchSort) => navigate({ sort }, 'replace'), [navigate]);

  const handleOpenResult = useCallback(
    (postId: string) => {
      hasOpenedFromGridRef.current = true;
      navigate({ openPostId: postId }, 'push');
    },
    [navigate]
  );

  const handleOpenReelResult = useCallback(
    (postId: string, reelIds: string[]) => {
      hasOpenedFromGridRef.current = true;
      setGridReelIds(reelIds.includes(postId) ? reelIds : [postId]);
      navigate({ openPostId: postId, isOpenReel: true }, 'push');
    },
    [navigate]
  );

  // Mở từ grid thì Back của trình duyệt đưa về đúng grid (giữ vị trí cuộn); vào thẳng link thì thay URL.
  const handleBackToResults = useCallback(() => {
    if (hasOpenedFromGridRef.current) {
      hasOpenedFromGridRef.current = false;
      router.back();
      return;
    }
    navigate({ openPostId: null }, 'replace');
  }, [navigate, router]);

  const handleOpenComposer = useCallback(
    (type?: 'video' | 'vlog') => {
      setComposerPostType(type ?? (activeView === 'reels' ? 'video' : 'vlog'));
      setComposerDraftId(null);
      setIsComposerOpen(true);
    },
    [activeView]
  );

  // Nút ⊕ của thanh đáy điện thoại (TF98) mở khung soạn bài qua ?compose=; bỏ tham số ngay (replace) để Back hay
  // F5 không mở lại. Chưa đăng nhập thì ⊕ đã đi qua trang đăng nhập, ở đây chỉ bỏ tham số.
  const composeRequest = isReady ? readComposeType(searchParams.get(COMPOSE_PARAM)) : null;
  const [lastComposeRequest, setLastComposeRequest] = useState<ComposeType | null>(null);
  if (composeRequest !== lastComposeRequest) {
    setLastComposeRequest(composeRequest);
    if (composeRequest && user) {
      setComposerPostType(composeRequest);
      setComposerDraftId(null);
      setIsComposerOpen(true);
    }
  }
  useEffect(() => {
    if (composeRequest) router.replace(removeComposeParam(pathname, searchParams.toString()), { scroll: false });
  }, [composeRequest, router, pathname, searchParams]);

  return (
    <div ref={pageRef} className={`${styles.feedPageWrapper} ${isReels ? styles.feedPageWrapperReels : ''}`}>
      {/* 1. Thanh Dock icon sát mép trái chuẩn Instagram (64px) */}
      <InstagramLeftDock
        activeView={activeView}
        onSelectView={handleSelectView}
        searchKeyword={searchKeyword}
        onSearchSubmit={handleSubmitSearch}
        activeFilter={filterMode}
        onSelectFilter={handleSelectFilter}
        isItineraryOpen={activeItineraryOpen}
        onToggleItinerary={handleToggleActiveItinerary}
        onOpenComposer={handleOpenComposer}
      />

      {/* 2. Vung noi dung chinh: Giu Feed mounted de duy tri vi tri cuon khi chuyen doi che do */}
      <div
        className={`${styles.feedViewSlot} ${isPostsVisible ? styles.feedViewSlotActive : ''}`}
        style={{ display: isPostsVisible ? 'flex' : 'none' }}
      >
        <SocialFeedView
          isVisible={isPostsVisible}
          searchKeyword={searchKeyword}
          searchSort={searchSort}
          focusPostId={openPostId}
          focusCommentId={focusCommentId}
          onBackToResults={isSearching ? handleBackToResults : undefined}
          isItineraryOpen={isPostsItineraryOpen}
          isItineraryPinned={isPinnedScreen}
          onOpenItinerary={() => setPostsItineraryChoice(true)}
          onCloseItinerary={() => {
            if (!isPinnedScreen) setPostsItineraryChoice(false);
          }}
          filterMode={filterMode}
          isComposerOpen={isComposerOpen}
          onOpenComposer={handleOpenComposer}
          onCloseComposer={() => setIsComposerOpen(false)}
        />
      </div>

      {/* Grid giữ mounted khi mở bài để quay lại vẫn đúng vị trí cuộn. */}
      {isSearching && (
        <div
          className={`${styles.feedViewSlot} ${isSearchGrid ? styles.feedViewSlotActive : ''}`}
          style={{ display: isSearchGrid ? 'flex' : 'none' }}
        >
          <SearchResultsGrid
            keyword={searchKeyword}
            resultType={searchResultType}
            onChangeResultType={handleChangeResultType}
            sort={searchSort}
            onChangeSort={handleChangeSort}
            onOpenPost={handleOpenResult}
            onOpenReel={handleOpenReelResult}
            onClearSearch={() => handleSubmitSearch('')}
          />
        </div>
      )}

      {isReels && (
        <InspirationImmersiveViewer
          // Đổi giữa bảng tin Reels và Reels của kết quả thì dựng lại từ đầu (bài đang xem, vị trí cuộn).
          key={searchReelIds ? `search:${openPostId}` : sharedReelId ? `shared:${sharedReelId}` : 'feed'}
          searchReelIds={searchReelIds}
          pinnedPostId={sharedReelId}
          initialPostId={isSearchReelOpen || sharedReelId ? openPostId : null}
          focusCommentId={focusCommentId}
          onBackToResults={isSearchReelOpen ? handleBackToResults : undefined}
          onSearchKeywordChange={handleSubmitSearch}
          isItineraryOpen={isReelsItineraryOpen}
          onToggleItinerary={() => setReelsItineraryChoice(!isReelsItineraryOpen)}
          onOpenComposer={handleOpenComposer}
        />
      )}

      {/* 3. Modal Tao / Chinh sua bai viet dung chung (Video Reels / Bai viet anh) */}
      {isComposerOpen && user && (
        <ComposerModal
          initialView="compose"
          initialPostType={composerPostType}
          initialDraftId={composerDraftId}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
      <PublishToast />
    </div>
  );
}
