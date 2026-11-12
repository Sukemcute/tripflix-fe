'use client';

import React from 'react';
import { vi } from '@tripflix/i18n';
import { SocialIcon } from '../live-posts';
import styles from './social-feed.module.css';

export type FeedNavFilter = 'all' | 'following' | 'saved' | 'withTrip';

export interface FloatingNavRailProps {
  activeFilter: FeedNavFilter;
  onSelectFilter: (filter: FeedNavFilter) => void;
  isLoggedIn?: boolean;
  onOpenComposer: () => void;
}

export function FloatingNavRail({
  activeFilter,
  onSelectFilter,
  isLoggedIn: _isLoggedIn,
  onOpenComposer,
}: FloatingNavRailProps) {
  return (
    <aside className={styles.railColumn} aria-label={vi.api.feedNavAria}>
      <nav className={styles.floatingRail}>
        {/* Dành cho bạn (Feed chính) */}
        <button
          type="button"
          className={`${styles.railItemBtn} ${activeFilter === 'all' ? styles.railItemBtnActive : ''}`}
          data-tooltip="Dành cho bạn"
          aria-label="Dành cho bạn"
          onClick={() => onSelectFilter('all')}
        >
          <SocialIcon name="sparkles" size={20} />
        </button>

        {/* Đang theo dõi */}
        <button
          type="button"
          className={`${styles.railItemBtn} ${activeFilter === 'following' ? styles.railItemBtnActive : ''}`}
          data-tooltip="Đang theo dõi"
          aria-label="Đang theo dõi"
          onClick={() => onSelectFilter('following')}
        >
          <SocialIcon name="users" size={20} />
        </button>

        {/* Lịch trình du lịch */}
        <button
          type="button"
          className={`${styles.railItemBtn} ${activeFilter === 'withTrip' ? styles.railItemBtnActive : ''}`}
          data-tooltip={vi.api.immersiveFilterWithTrip}
          aria-label={vi.api.immersiveFilterWithTrip}
          onClick={() => onSelectFilter('withTrip')}
        >
          <SocialIcon name="calendar" size={20} />
        </button>

        {/* Bài viết đã lưu */}
        <button
          type="button"
          className={`${styles.railItemBtn} ${activeFilter === 'saved' ? styles.railItemBtnActive : ''}`}
          data-tooltip={vi.api.immersiveFilterSaved}
          aria-label={vi.api.immersiveFilterSaved}
          onClick={() => onSelectFilter('saved')}
        >
          <SocialIcon name="bookmark" size={20} />
        </button>

        {/* Nút Tạo bài đăng mới */}
        <button
          type="button"
          className={`${styles.railItemBtn} ${styles.railCreateBtn}`}
          data-tooltip="Tạo bài viết mới"
          aria-label="Tạo bài viết mới"
          onClick={onOpenComposer}
        >
          <SocialIcon name="plus" size={20} />
        </button>
      </nav>
    </aside>
  );
}
