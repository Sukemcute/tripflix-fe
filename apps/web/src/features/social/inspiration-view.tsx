'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useApiSession } from '@tripflix/api-client';
import type { SocialPostDto } from '@tripflix/api-client/core-api/model/index';
import { validateInspirationKeyword } from '@/features/discovery/inspiration-keyword';
import { InstagramLeftDock } from './feed/instagram-left-dock';
import type { FeedNavFilter } from './feed/floating-nav-rail';
import { SocialFeedView } from './feed/social-feed-view';
import { SearchResultsGrid } from './search-results-grid';
import { pushRecentSearch, readRecentSearches, writeRecentSearches } from './recent-searches';
import {
  buildInspirationHref,
  parseSearchResultType,
  SEARCH_OPEN_KIND_PARAM,
  SEARCH_OPEN_PARAM,
  SEARCH_QUERY_PARAM,
  SEARCH_TYPE_PARAM,
  type InspirationUrlChanges,
  type SearchResultType,
} from './search-url';
import { useIsWideScreen } from './use-wide-screen';
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
  const { user } = useApiSession();

  // Tinh toan che do xem truc tiep tu URL query param (?view=posts hoac ?view=reels)
  const viewParam = searchParams.get('view');
  const openPostId = searchParams.get(SEARCH_OPEN_PARAM) || null;
  const isOpenReel = searchParams.get(SEARCH_OPEN_KIND_PARAM) === 'reel';
  const activeView: 'posts' | 'reels' = (viewParam === 'reels' && !openPostId) || (openPostId && isOpenReel) ? 'reels' : 'posts';

  // Tìm kiếm theo URL (?q= từ khoá đã chốt, ?open= bài mở từ grid) để F5 và nút Back giữ đúng chỗ.
  const rawKeyword = searchParams.get(SEARCH_QUERY_PARAM) ?? '';
  const searchKeyword = rawKeyword ? validateInspirationKeyword(rawKeyword).keyword : '';
  const isSearching = searchKeyword.length > 0;
  const searchResultType = parseSearchResultType(searchParams.get(SEARCH_TYPE_PARAM));
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

  // Cac trang thai chung dieu phoi qua Instagram Left Dock
  // Mặc định: tab Bài viết mở sẵn Lịch trình trên màn rộng (thông tin chính đi kèm bài đọc); Reels để đóng
  // cho khung video rộng như TikTok; màn hẹp luôn đóng vì Lịch trình là bottom sheet che nội dung.
  // Người dùng đóng/mở thì giữ lựa chọn đó khi chuyển qua lại giữa hai tab.
  const isWideScreen = useIsWideScreen();
  const [itineraryChoice, setIsItineraryOpen] = useState<boolean | null>(null);
  const isItineraryOpen = itineraryChoice ?? (isWideScreen && !isReels);
  const [filterMode, setFilterMode] = useState<FeedNavFilter>('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerPostType, setComposerPostType] = useState<'video' | 'vlog'>('vlog');

  const navigate = useCallback(
    (changes: InspirationUrlChanges, mode: 'push' | 'replace') => {
      const href = buildInspirationHref(pathname, searchParams, changes);
      if (mode === 'push') router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router, pathname, searchParams]
  );

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

  const handleOpenResult = useCallback(
    (post: SocialPostDto) => {
      hasOpenedFromGridRef.current = true;
      navigate({ openPostId: post.id }, 'push');
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
      setIsComposerOpen(true);
    },
    [activeView]
  );

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
        isItineraryOpen={isItineraryOpen}
        onToggleItinerary={() => setIsItineraryOpen(!isItineraryOpen)}
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
          focusPostId={openPostId}
          onBackToResults={isSearching ? handleBackToResults : undefined}
          isItineraryOpen={isItineraryOpen}
          onOpenItinerary={() => setIsItineraryOpen(true)}
          onCloseItinerary={() => setIsItineraryOpen(false)}
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
          onBackToResults={isSearchReelOpen ? handleBackToResults : undefined}
          onSearchKeywordChange={handleSubmitSearch}
          isItineraryOpen={isItineraryOpen}
          onToggleItinerary={() => setIsItineraryOpen(!isItineraryOpen)}
          onOpenComposer={handleOpenComposer}
        />
      )}

      {/* 3. Modal Tao / Chinh sua bai viet dung chung (Video Reels / Bai viet anh) */}
      {isComposerOpen && user && (
        <ComposerModal
          initialView="compose"
          initialPostType={composerPostType}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </div>
  );
}
