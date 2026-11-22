'use client';

import { useEffect, useRef, useState } from 'react';
import { vi } from '@tripflix/i18n';
import { COMMON_EMOJIS, pushRecentEmoji } from './emoji-picker-data';
import styles from './emoji-picker.module.css';

/** Bấm chuột vào emoji không lấy focus khỏi ô nhập, để con trỏ vẫn ở đó và gõ tiếp được ngay. */
function keepInputFocus(event: React.MouseEvent) {
  event.preventDefault();
}

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
  /**
   * Vùng vẫn tính là "bên trong" (ô nhập và nút mở bảng): bấm vào đó không đóng bảng,
   * để người dùng vừa gõ chữ vừa chèn emoji.
   */
  keepOpenRef?: React.RefObject<HTMLElement | null>;
}

/** Bảng emoji bật lên phía trên ô nhập; vẫn gõ chữ được khi bảng mở, chọn xong vẫn mở để chèn tiếp, Esc hoặc bấm ra ngoài thì đóng. */
export function EmojiPicker({ onSelect, onClose, keepOpenRef }: EmojiPickerProps) {
  const rootRef = useRef<HTMLDialogElement | null>(null);
  // Bảng chỉ hiện sau khi người dùng bấm (luôn ở client) nên đọc localStorage ngay khi khởi tạo được.
  const [recent, setRecent] = useState<string[]>(readRecentEmojis);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || keepOpenRef?.current?.contains(target)) return;
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
  }, [onClose, keepOpenRef]);

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
            onMouseDown={keepInputFocus}
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
              onMouseDown={keepInputFocus}
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
