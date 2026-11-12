'use client';

import { useEffect, useRef, useState } from 'react';
import { vi } from '@tripflix/i18n';
import { COMMON_EMOJIS, pushRecentEmoji } from './emoji-picker-data';
import styles from './emoji-picker.module.css';

const RECENT_EMOJI_STORAGE_KEY = 'tripflix:recent-emojis';

function readRecentEmojis(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    // localStorage bị chặn (chế độ riêng tư) hoặc dữ liệu hỏng: coi như chưa có emoji gần đây.
    return [];
  }
}

function saveRecentEmojis(recent: string[]): void {
  try {
    window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Không lưu được thì chỉ mất hàng "Dùng gần đây", không ảnh hưởng việc chèn emoji.
  }
}

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Nút mở bảng: bấm vào nút này không tính là bấm ra ngoài (nút tự đóng/mở). */
  toggleRef?: React.RefObject<HTMLElement | null>;
}

/** Bảng emoji bật lên phía trên ô nhập; chọn xong vẫn mở để chèn tiếp, Esc hoặc bấm ra ngoài thì đóng. */
export function EmojiPicker({ onSelect, onClose, toggleRef }: EmojiPickerProps) {
  const rootRef = useRef<HTMLDialogElement | null>(null);
  // Bảng chỉ hiện sau khi người dùng bấm (luôn ở client) nên đọc localStorage ngay khi khởi tạo được.
  const [recent, setRecent] = useState<string[]>(readRecentEmojis);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || toggleRef?.current?.contains(target)) return;
      onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, toggleRef]);

  function handleSelect(emoji: string) {
    const nextRecent = pushRecentEmoji(recent, emoji);
    setRecent(nextRecent);
    saveRecentEmojis(nextRecent);
    onSelect(emoji);
  }

  return (
    <dialog open ref={rootRef} className={styles.picker} aria-label={vi.api.emojiPickerTitle}>
      <div className={styles.grid}>
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.emojiBtn}
            aria-label={emoji}
            onClick={() => handleSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {recent.length > 0 && (
        <div className={styles.recentRow} title={vi.api.emojiPickerRecent}>
          {recent.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.emojiBtn}
              aria-label={emoji}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </dialog>
  );
}
