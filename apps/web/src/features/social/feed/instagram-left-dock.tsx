'use client';

import React, { useState, useRef, useEffect } from 'react';
import { t, vi } from '@tripflix/i18n';
import { validateInspirationKeyword } from '@/features/discovery/inspiration-keyword';
import { SocialIcon } from '../live-posts';
import { readRecentSearches, removeRecentSearch, writeRecentSearches } from '../recent-searches';
import type { FeedNavFilter } from './floating-nav-rail';
import styles from './social-feed.module.css';

export interface InstagramLeftDockProps {
  activeView: 'posts' | 'reels';
  onSelectView: (view: 'posts' | 'reels') => void;
  /** Từ khoá đã chốt (đang hiện kết quả). */
  searchKeyword: string;
  /** Chỉ gọi khi nhấn Enter, bấm chip hay xoá tìm kiếm; gõ chữ không gọi API. Rỗng là thoát tìm kiếm. */
  onSearchSubmit: (keyword: string) => void;
  activeFilter: FeedNavFilter;
  onSelectFilter: (filter: FeedNavFilter) => void;
  isItineraryOpen: boolean;
  onToggleItinerary: () => void;
  onOpenComposer: (type?: 'video' | 'vlog') => void;
}

const SEARCH_SUGGESTIONS = Object.values(vi.api.feedSearchSuggestions);
/** Số gợi ý đầu có icon xu hướng (kiểu TikTok), các gợi ý sau là chấm nhỏ. */
const HIGHLIGHTED_SUGGESTION_COUNT = 3;
/** "Tìm gần đây" hiện 5 mục, bấm Xem thêm mới hiện hết. */
const RECENT_COLLAPSED_COUNT = 5;

export function InstagramLeftDock({
  activeView,
  onSelectView,
  searchKeyword,
  onSearchSubmit,
  activeFilter,
  onSelectFilter,
  isItineraryOpen: _isItineraryOpen,
  onToggleItinerary: _onToggleItinerary,
  onOpenComposer,
}: InstagramLeftDockProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [draftKeyword, setDraftKeyword] = useState(searchKeyword);
  const [lastSearchKeyword, setLastSearchKeyword] = useState(searchKeyword);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const visibleRecentKeywords = isRecentExpanded ? recentKeywords : recentKeywords.slice(0, RECENT_COLLAPSED_COUNT);
  // Từ khoá chốt từ nơi khác (bấm hashtag, Back trình duyệt) thì ô nhập theo đúng từ khoá đó.
  if (lastSearchKeyword !== searchKeyword) {
    setLastSearchKeyword(searchKeyword);
    setDraftKeyword(searchKeyword);
    setSearchError(null);
  }
  const isSearching = searchKeyword.trim().length > 0;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDrawerRef = useRef<HTMLElement | null>(null);

  const submitSearch = (value: string) => {
    if (!value.trim()) {
      setSearchError(null);
      onSearchSubmit('');
      return;
    }
    const { keyword, error } = validateInspirationKeyword(value);
    if (error) {
      setSearchError(vi.api[error]);
      return;
    }
    setSearchError(null);
    setDraftKeyword(keyword);
    onSearchSubmit(keyword);
    setIsSearchOpen(false);
  };

  const toggleSearchDrawer = () => {
    // Đọc "Tìm gần đây" lúc mở (không đọc lúc render server) để không lệch hydration.
    if (!isSearchOpen) {
      setRecentKeywords(readRecentSearches());
      setIsRecentExpanded(false);
    }
    setIsSearchOpen((prev) => !prev);
  };

  const updateRecentKeywords = (nextKeywords: string[]) => {
    setRecentKeywords(nextKeywords);
    writeRecentSearches(nextKeywords);
  };

  // Tu dong focus input khi mo Search Drawer
  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isSearchOpen]);

  // Click outside & Escape de dong Search Drawer
  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (searchDrawerRef.current && !searchDrawerRef.current.contains(target)) {
        // Neu khong phai bam vao nut search tren dock
        const dockSearchBtn = document.getElementById('dock-search-btn');
        if (!dockSearchBtn?.contains(target)) {
          setIsSearchOpen(false);
        }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSearchOpen]);

  // Đang tìm thì chỉ nút Tìm kiếm sáng, các tab khác về trạng thái thường.
  const getItemClass = (isActive: boolean) =>
    `${styles.dockItemBtn} ${isActive && !isSearching ? styles.dockItemBtnActive : ''}`;

  return (
    <>
      <aside className={styles.instagramDock} aria-label={vi.api.feedNavAria}>
        <div className={styles.dockCenterGroup}>
          <button
            id="dock-search-btn"
            type="button"
            className={`${styles.dockItemBtn} ${isSearchOpen || isSearching ? styles.dockItemBtnActive : ''}`}
            data-tooltip={vi.api.dockSearch}
            aria-label={vi.api.dockSearch}
            aria-expanded={isSearchOpen}
            onClick={toggleSearchDrawer}
          >
            <SocialIcon name="search" size={20} />
            {isSearching && <span className={styles.dockActiveDot} aria-hidden="true" />}
          </button>

          <button
            type="button"
            className={getItemClass(activeView === 'posts' && activeFilter === 'all')}
            data-tooltip={vi.api.dockPosts}
            aria-label={vi.api.dockPosts}
            onClick={() => {
              onSelectView('posts');
              onSelectFilter('all');
            }}
          >
            <SocialIcon name="compass" size={21} />
          </button>

          <button
            type="button"
            className={getItemClass(activeView === 'reels')}
            data-tooltip={vi.api.dockReels}
            aria-label={vi.api.dockReels}
            onClick={() => onSelectView('reels')}
          >
            <SocialIcon name="video" size={21} />
          </button>

          <button
            type="button"
            className={getItemClass(activeFilter === 'following' && activeView === 'posts')}
            data-tooltip={vi.api.dockFollowing}
            aria-label={vi.api.dockFollowing}
            onClick={() => {
              if (activeView !== 'posts') onSelectView('posts');
              onSelectFilter(activeFilter === 'following' ? 'all' : 'following');
            }}
          >
            <SocialIcon name="users" size={20} />
          </button>

          <button
            type="button"
            className={getItemClass(activeFilter === 'saved' && activeView === 'posts')}
            data-tooltip={vi.api.immersiveFilterSaved}
            aria-label={vi.api.immersiveFilterSaved}
            onClick={() => {
              if (activeView !== 'posts') onSelectView('posts');
              onSelectFilter(activeFilter === 'saved' ? 'all' : 'saved');
            }}
          >
            <SocialIcon name="bookmark" size={20} />
          </button>

          {/* Tạo bài: Reels mở composer video, tab Bài viết mở composer bài viết */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${styles.dockCreateBtn}`}
            data-tooltip={vi.api.dockCreatePost}
            aria-label={vi.api.dockCreatePost}
            onClick={() => onOpenComposer(activeView === 'reels' ? 'video' : 'vlog')}
          >
            <SocialIcon name="plus" size={20} />
          </button>
        </div>
      </aside>

      {isSearchOpen && (
        <section ref={searchDrawerRef} className={styles.dockSearchDrawer} aria-label={vi.api.feedSearchDrawerAria}>
          <div className={styles.searchDrawerHeader}>
            <h3 className={styles.searchDrawerTitle}>{vi.api.dockSearch}</h3>
            <button
              type="button"
              className={styles.searchDrawerCloseBtn}
              aria-label={vi.api.close}
              onClick={() => setIsSearchOpen(false)}
            >
              <SocialIcon name="close" size={16} />
            </button>
          </div>

          <div className={styles.searchDrawerBody}>
            {/* Nhấn Enter mới tìm; gõ chữ không gọi API. */}
            <form
              className={styles.searchDrawerInputWrap}
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch(draftKeyword);
              }}
            >
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                className={styles.searchDrawerInput}
                placeholder={vi.api.feedSearchInputPlaceholder}
                aria-label={vi.api.dockSearch}
                aria-invalid={searchError ? true : undefined}
                aria-describedby={searchError ? 'dock-search-error' : undefined}
                value={draftKeyword}
                onChange={(event) => {
                  setDraftKeyword(event.target.value);
                  if (searchError) setSearchError(null);
                }}
              />
              {draftKeyword && (
                <button
                  type="button"
                  className={styles.searchClearBtn}
                  aria-label={vi.api.feedSearchClearKeyword}
                  onClick={() => {
                    setDraftKeyword('');
                    setSearchError(null);
                    searchInputRef.current?.focus();
                  }}
                >
                  <SocialIcon name="close" size={12} />
                </button>
              )}
            </form>
            {searchError && (
              <p id="dock-search-error" className={styles.searchDrawerError} role="alert">
                {searchError}
              </p>
            )}

            {recentKeywords.length > 0 && (
              <div className={styles.searchDrawerSection}>
                <span className={styles.searchDrawerSectionTitle}>{vi.api.feedSearchRecent}</span>
                <ul className={styles.searchDrawerList}>
                  {visibleRecentKeywords.map((keyword) => (
                    <li key={keyword} className={styles.searchDrawerListItem}>
                      <button type="button" className={styles.searchDrawerItemBtn} onClick={() => submitSearch(keyword)}>
                        <span className={styles.searchDrawerItemIcon}>
                          <SocialIcon name="clock" size={16} />
                        </span>
                        <span className={styles.searchDrawerItemText}>{keyword}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.searchRecentRemove}
                        aria-label={t('api.feedSearchRecentRemove', { query: keyword })}
                        onClick={() => updateRecentKeywords(removeRecentSearch(recentKeywords, keyword))}
                      >
                        <SocialIcon name="close" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                {recentKeywords.length > RECENT_COLLAPSED_COUNT && (
                  <button
                    type="button"
                    className={styles.searchDrawerMoreBtn}
                    aria-expanded={isRecentExpanded}
                    onClick={() => setIsRecentExpanded((prev) => !prev)}
                  >
                    {isRecentExpanded ? vi.api.feedSearchRecentLess : vi.api.feedSearchRecentMore}
                    <span className={isRecentExpanded ? styles.searchDrawerMoreIconOpen : undefined}>
                      <SocialIcon name="chevronDown" size={14} />
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className={styles.searchDrawerSection}>
              <span className={styles.searchDrawerSectionTitle}>{vi.api.feedSearchSuggestedTitle}</span>
              <ul className={styles.searchDrawerList}>
                {SEARCH_SUGGESTIONS.map((suggestion, index) => (
                  <li key={suggestion} className={styles.searchDrawerListItem}>
                    <button type="button" className={styles.searchDrawerItemBtn} onClick={() => submitSearch(suggestion)}>
                      {index < HIGHLIGHTED_SUGGESTION_COUNT ? (
                        <span className={`${styles.searchDrawerItemIcon} ${styles.searchDrawerItemIconHot}`}>
                          <SocialIcon name="trendingUp" size={16} />
                        </span>
                      ) : (
                        <span className={styles.searchDrawerItemIcon}>
                          <span className={styles.searchDrawerItemDot} />
                        </span>
                      )}
                      <span className={styles.searchDrawerItemText}>{suggestion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
