'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useApiSession } from '@tripflix/api-client';
import { InstagramLeftDock } from './feed/instagram-left-dock';
import type { FeedNavFilter } from './feed/floating-nav-rail';
import { SocialFeedView } from './feed/social-feed-view';
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

export interface InspirationViewProps {
  initialKeyword?: string;
}

export function InspirationView({ initialKeyword = '' }: InspirationViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useApiSession();

  // Tinh toan che do xem truc tiep tu URL query param (?view=posts hoac ?view=reels)
  const viewParam = searchParams.get('view');
  const activeView: 'posts' | 'reels' = viewParam === 'reels' ? 'reels' : 'posts';
  const isReels = activeView === 'reels';

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
  const [searchKeyword, setSearchKeyword] = useState<string>(initialKeyword);

  const handleSelectView = useCallback(
    (nextView: 'posts' | 'reels') => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === 'reels') {
        params.set('view', 'reels');
      } else {
        params.delete('view');
      }
      const newQuery = params.toString();
      const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleOpenComposer = useCallback(
    (type?: 'video' | 'vlog') => {
      setComposerPostType(type ?? (activeView === 'reels' ? 'video' : 'vlog'));
      setIsComposerOpen(true);
    },
    [activeView]
  );

  return (
    <div className={`${styles.feedPageWrapper} ${isReels ? styles.feedPageWrapperReels : ''}`}>
      {/* 1. Thanh Dock icon sát mép trái chuẩn Instagram (64px) */}
      <InstagramLeftDock
        activeView={activeView}
        onSelectView={handleSelectView}
        searchKeyword={searchKeyword}
        onSearchKeywordChange={setSearchKeyword}
        activeFilter={filterMode}
        onSelectFilter={setFilterMode}
        isItineraryOpen={isItineraryOpen}
        onToggleItinerary={() => setIsItineraryOpen(!isItineraryOpen)}
        onOpenComposer={handleOpenComposer}
      />

      {/* 2. Vung noi dung chinh: Giu Feed mounted de duy tri vi tri cuon khi chuyen doi che do */}
      <div
        className={`${styles.feedViewSlot} ${activeView === 'posts' ? styles.feedViewSlotActive : ''}`}
        style={{ display: activeView === 'posts' ? 'flex' : 'none' }}
      >
        <SocialFeedView
          initialKeyword={initialKeyword}
          searchKeyword={searchKeyword}
          isItineraryOpen={isItineraryOpen}
          onOpenItinerary={() => setIsItineraryOpen(true)}
          onCloseItinerary={() => setIsItineraryOpen(false)}
          filterMode={filterMode}
          isComposerOpen={isComposerOpen}
          onOpenComposer={handleOpenComposer}
          onCloseComposer={() => setIsComposerOpen(false)}
        />
      </div>

      {activeView === 'reels' && (
        <InspirationImmersiveViewer
          initialKeyword={initialKeyword}
          searchKeyword={searchKeyword}
          onSearchKeywordChange={setSearchKeyword}
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
