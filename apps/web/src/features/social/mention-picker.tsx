'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAvatarUrl, HttpError, normalizeUserSearchQuery, useUserSearch } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useDebouncedValue } from '../shared/use-debounced-value';
import { getAvatarTone } from './avatar-tone';
import styles from './mention-picker.module.css';

export const MENTION_SEARCH_DEBOUNCE_MS = 250;

/**
 * Chuẩn hoá cặp từ khoá đang gõ (`liveQuery`) và từ khoá đã qua debounce (`debouncedQuery`):
 * nếu từ khoá đang gõ chưa đủ điều kiện tìm (`isSearchable === false`), trả `effectiveQuery = ''`
 * để hiện lời nhắc ngay mà không gọi API.
 */
export function resolveMentionSearchInput(liveQuery: string, debouncedQuery: string) {
  const liveNormalized = normalizeUserSearchQuery(liveQuery);
  const effectiveQuery = liveNormalized.isSearchable ? debouncedQuery : '';
  const debouncedNormalized = normalizeUserSearchQuery(effectiveQuery);
  const isDebouncing = liveNormalized.isSearchable && liveNormalized.query !== debouncedNormalized.query;
  return { liveNormalized, debouncedNormalized, effectiveQuery, isDebouncing };
}

export interface MentionUserItem {
  id: string;
  displayName: string;
}

export interface MentionPickerProps {
  /** Từ khoá sau ký tự @ */
  query: string;
  /** Gọi khi người dùng chọn một người */
  onSelect: (user: MentionUserItem) => void;
  /** Đóng bảng gợi ý */
  onClose: () => void;
  /** Vùng chứa ô nhập (bấm vào ô nhập không đóng bảng) */
  keepOpenRef?: React.RefObject<HTMLElement | null>;
}

export interface MentionKeyDownContext {
  users: readonly MentionUserItem[];
  activeIndex: number;
  onSelect: (user: MentionUserItem) => void;
  onClose: () => void;
  updateActiveIndex: (next: number | ((prev: number) => number)) => void;
}

/**
 * Xử lý phím điều hướng khi bảng gợi ý đang mở: ↑ ↓ di chuyển, Enter hoặc Tab chèn người đang chọn, Esc đóng bảng.
 * Trả về true nếu sự kiện đã được xử lý và chặn mặc định.
 */
export function handleMentionPickerKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing' | 'preventDefault' | 'stopPropagation'>,
  { users, activeIndex, onSelect, onClose, updateActiveIndex }: MentionKeyDownContext,
): boolean {
  if (event.isComposing) return false;

  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return true;
  }

  if (!users.length) return false;

  const safeIndex = Math.min(Math.max(activeIndex, 0), users.length - 1);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    updateActiveIndex((prev) => (prev + 1) % users.length);
    return true;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    updateActiveIndex((prev) => (prev - 1 + users.length) % users.length);
    return true;
  }

  if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
    const selected = users[safeIndex];
    if (selected) {
      event.preventDefault();
      event.stopPropagation();
      onSelect(selected);
      return true;
    }
  }

  return false;
}

/** Chữ cái đầu của tên làm avatar fallback */
function getInitial(displayName: string): string {
  return Array.from(displayName.trim())[0]?.toUpperCase() ?? '·';
}

/** Giữ focus ở ô nhập khi bấm chuột vào gợi ý để gõ tiếp được ngay */
function keepInputFocus(event: React.MouseEvent) {
  event.preventDefault();
}

/**
 * Bảng gợi ý tag người dùng (@mention) cho ô bình luận (TF25).
 * Tìm người dùng theo tên qua useUserSearch (GET /v1/users/search).
 * Điều khiển bằng phím ↑ ↓ Enter Esc, ô nhập luôn giữ focus.
 */
export function MentionPicker({
  query,
  onSelect,
  onClose,
  keepOpenRef,
}: MentionPickerProps) {
  const rootRef = useRef<HTMLDialogElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Lưu index đồng bộ với query, tránh gọi setState đồng bộ trong useEffect
  const [indexState, setIndexState] = useState<{ query: string; index: number }>({
    query,
    index: 0,
  });
  const activeIndex = indexState.query === query ? indexState.index : 0;
  const updateActiveIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      setIndexState((curr) => {
        const prev = curr.query === query ? curr.index : 0;
        const resolved = typeof next === 'function' ? next(prev) : next;
        return { query, index: resolved };
      });
    },
    [query],
  );

  const debouncedQuery = useDebouncedValue(query, MENTION_SEARCH_DEBOUNCE_MS);
  const { liveNormalized, effectiveQuery, isDebouncing } = resolveMentionSearchInput(query, debouncedQuery);
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
    refetch,
  } = useUserSearch(effectiveQuery);

  const users: MentionUserItem[] = useMemo(
    () => (liveNormalized.isSearchable ? (data?.items ?? []) : []),
    [liveNormalized.isSearchable, data?.items],
  );
  const hasUsers = users.length > 0;
  const isRateLimited = error instanceof HttpError && error.status === 429;
  const isWaitingForSearch = !isError && !hasUsers && (isLoading || isFetching || isDebouncing);
  const isRefreshingExistingList = hasUsers && (isPlaceholderData || isFetching || isDebouncing);

  // Cuộn item đang chọn vào tầm nhìn khi di chuyển phím mũi tên
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Đóng khi click ra ngoài vùng ô nhập và bảng
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || keepOpenRef?.current?.contains(target)) {
        return;
      }
      onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [onClose, keepOpenRef]);

  // Điều khiển bàn phím ↑ ↓ Enter Tab Esc trong lúc con trỏ vẫn ở ô nhập
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      handleMentionPickerKeyDown(event, {
        users,
        activeIndex,
        onSelect,
        onClose,
        updateActiveIndex,
      });
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [users, activeIndex, onClose, onSelect, updateActiveIndex]);

  return (
    <dialog
      open
      ref={rootRef}
      className={styles.picker}
      aria-label={vi.api.mentionPickerTitle}
    >
      <div className={styles.header}>{vi.api.mentionPickerTitle}</div>

      {!liveNormalized.isSearchable ? (
        <output className={styles.statusText}>{vi.api.mentionSearchPrompt}</output>
      ) : isError && !isDebouncing ? (
        isRateLimited ? (
          <output className={styles.statusText}>{vi.api.mentionRateLimited}</output>
        ) : (
          <div className={styles.statusError}>
            <output className={styles.statusText}>{vi.api.mentionSearchFailed}</output>
            <button
              type="button"
              className={styles.retryBtn}
              onMouseDown={keepInputFocus}
              onClick={() => {
                void refetch?.();
              }}
            >
              {vi.api.retry}
            </button>
          </div>
        )
      ) : hasUsers ? (
        <div
          className={`${styles.userList} ${isRefreshingExistingList ? styles.userListRefreshing : ''}`}
        >
          {users.map((user, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={user.id}
                ref={isSelected ? activeItemRef : null}
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                className={`${styles.userItem} ${isSelected ? styles.userItemActive : ''}`}
                onMouseDown={keepInputFocus}
                onMouseEnter={() => updateActiveIndex(index)}
                onClick={() => onSelect(user)}
              >
                <span
                  className={styles.avatar}
                  data-tone={getAvatarTone(user.displayName)}
                  aria-hidden="true"
                >
                  {getInitial(user.displayName)}
                  {/* oxlint-disable-next-line nextjs/no-img-element */}
                  <img
                    className={styles.avatarImg}
                    src={getAvatarUrl(user.id)}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      (event.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </span>
                <span className={styles.userName}>{user.displayName}</span>
              </button>
            );
          })}
        </div>
      ) : isWaitingForSearch ? (
        <output className={styles.statusText}>{vi.api.mentionSearching}</output>
      ) : (
        <output className={styles.statusText}>{vi.api.mentionNoResults}</output>
      )}
    </dialog>
  );
}
