'use client';

import React, { useState, useRef, useEffect } from 'react';
import { vi } from '@tripflix/i18n';
import { SocialIcon } from '../live-posts';
import type { FeedNavFilter } from './floating-nav-rail';
import styles from './social-feed.module.css';

export interface InstagramLeftDockProps {
  activeView: 'posts' | 'reels';
  onSelectView: (view: 'posts' | 'reels') => void;
  searchKeyword: string;
  onSearchKeywordChange: (keyword: string) => void;
  activeFilter: FeedNavFilter;
  onSelectFilter: (filter: FeedNavFilter) => void;
  isItineraryOpen: boolean;
  onToggleItinerary: () => void;
  onOpenComposer: (type?: 'video' | 'vlog') => void;
}

const POPULAR_TAGS = ['dalat', 'nhatrang', 'phuquoc', 'danang', 'sapa', 'vungtau', 'hanoi', 'hochiminh'];

export function InstagramLeftDock({
  activeView,
  onSelectView,
  searchKeyword,
  onSearchKeywordChange,
  activeFilter,
  onSelectFilter,
  isItineraryOpen: _isItineraryOpen,
  onToggleItinerary: _onToggleItinerary,
  onOpenComposer,
}: InstagramLeftDockProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDrawerRef = useRef<HTMLDivElement | null>(null);

  // Tu dong focus input khi mo Search Drawer
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
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

  return (
    <>
      <aside className={styles.instagramDock} aria-label={vi.api.feedNavAria}>
        {/* Nhom toan bo cac icon thao tac duoc can giua hoan toan theo chieu doc */}
        <div className={styles.dockCenterGroup}>
          {/* Nut chuyen sang che do Bai viet */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${activeView === 'posts' && activeFilter === 'all' ? styles.dockItemBtnActive : ''}`}
            data-tooltip="Bài viết"
            aria-label="Bài viết"
            onClick={() => {
              onSelectView('posts');
              onSelectFilter('all');
            }}
          >
            <SocialIcon name="compass" size={21} />
          </button>

          {/* Nut chuyen sang che do Reels */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${activeView === 'reels' ? styles.dockItemBtnActive : ''}`}
            data-tooltip="Reels"
            aria-label="Reels"
            onClick={() => onSelectView('reels')}
          >
            <SocialIcon name="video" size={21} />
          </button>

          {/* Nut Tim kiem */}
          <button
            id="dock-search-btn"
            type="button"
            className={`${styles.dockItemBtn} ${isSearchOpen || searchKeyword.trim() ? styles.dockItemBtnActive : ''}`}
            data-tooltip="Tìm kiếm"
            aria-label="Tìm kiếm"
            onClick={() => setIsSearchOpen((prev) => !prev)}
          >
            <SocialIcon name="search" size={20} />
            {searchKeyword.trim() && <span className={styles.dockActiveDot} aria-hidden="true" />}
          </button>

          {/* Nut Tao bai dang moi chung (Mo modal dang bai viet hoac reels) */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${styles.dockCreateBtn}`}
            data-tooltip="Tạo bài viết mới"
            aria-label="Tạo bài viết mới"
            onClick={() => onOpenComposer(activeView === 'reels' ? 'video' : 'vlog')}
          >
            <SocialIcon name="plus" size={20} />
          </button>

          {/* Bo loc: Dang theo doi */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${activeFilter === 'following' && activeView === 'posts' ? styles.dockItemBtnActive : ''}`}
            data-tooltip="Đang theo dõi"
            aria-label="Đang theo dõi"
            onClick={() => {
              if (activeView !== 'posts') onSelectView('posts');
              onSelectFilter(activeFilter === 'following' ? 'all' : 'following');
            }}
          >
            <SocialIcon name="users" size={20} />
          </button>

          {/* Bo loc: Da luu */}
          <button
            type="button"
            className={`${styles.dockItemBtn} ${activeFilter === 'saved' && activeView === 'posts' ? styles.dockItemBtnActive : ''}`}
            data-tooltip={vi.api.immersiveFilterSaved}
            aria-label={vi.api.immersiveFilterSaved}
            onClick={() => {
              if (activeView !== 'posts') onSelectView('posts');
              onSelectFilter(activeFilter === 'saved' ? 'all' : 'saved');
            }}
          >
            <SocialIcon name="bookmark" size={20} />
          </button>
        </div>
      </aside>

      {/* 4. Panel Tim kiem truot ra tu Dock ben trai */}
      {isSearchOpen && (
        <section
          ref={searchDrawerRef}
          className={styles.dockSearchDrawer}
          aria-label="Tìm kiếm cảm hứng"
        >
          <div className={styles.searchDrawerHeader}>
            <h3 className={styles.searchDrawerTitle}>Tìm kiếm</h3>
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
            <div className={styles.searchDrawerInputWrap}>
              <SocialIcon name="search" size={17} />
              <input
                ref={searchInputRef}
                type="search"
                className={styles.searchDrawerInput}
                placeholder={vi.api.feedSearchPlaceholder}
                value={searchKeyword}
                onChange={(event) => onSearchKeywordChange(event.target.value)}
              />
              {searchKeyword && (
                <button
                  type="button"
                  className={styles.searchClearBtn}
                  aria-label="Xóa từ khóa"
                  onClick={() => onSearchKeywordChange('')}
                >
                  <SocialIcon name="close" size={13} />
                </button>
              )}
            </div>

            <div className={styles.searchDrawerTagsSection}>
              <span className={styles.searchDrawerTagsLabel}>Chủ đề thịnh hành:</span>
              <div className={styles.searchDrawerTagsList}>
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.searchTagChip} ${
                      searchKeyword.toLowerCase().includes(tag) ? styles.searchTagChipActive : ''
                    }`}
                    onClick={() => {
                      onSearchKeywordChange(tag);
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {searchKeyword && (
              <div className={styles.searchActiveNotice}>
                <span>Đang tìm kiếm cho: <strong>"{searchKeyword}"</strong></span>
                <button
                  type="button"
                  className={styles.searchActiveResetBtn}
                  onClick={() => onSearchKeywordChange('')}
                >
                  Xóa tìm kiếm
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
