import { useEffect, useState } from 'react';

/** Khớp thời lượng hiệu ứng đóng sidebar trong CSS (sidebarExit*). */
export const SIDEBAR_EXIT_MS = 260;

export interface PresenceOptions {
  exitMs?: number;
  /**
   * Lần mở này có chạy hiệu ứng vào không. Đọc đúng lúc mở và giữ nguyên tới lần mở sau, để giá trị
   * đổi về sau (ví dụ người dùng vừa thao tác lần đầu) không làm hiệu ứng vào chạy lại trên phần đang mở.
   */
  shouldAnimateEnter?: boolean;
}

/**
 * Giữ component thêm một nhịp sau khi đóng để kịp chạy hiệu ứng thoát, rồi mới gỡ khỏi DOM.
 * Mở thì hiện ngay. `isClosing` để gắn class hiệu ứng thoát, `isEnterAnimated` để gắn class hiệu ứng vào.
 */
export function usePresence(
  isOpen: boolean,
  { exitMs = SIDEBAR_EXIT_MS, shouldAnimateEnter = true }: PresenceOptions = {},
): { isRendered: boolean; isClosing: boolean; isEnterAnimated: boolean } {
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  // Đang mở sẵn từ lúc khởi tạo (bố cục mặc định) thì không có hiệu ứng vào.
  const [isEnterAnimated, setIsEnterAnimated] = useState(false);

  // Cập nhật ngay trong lúc render khi isOpen đổi (thay cho setState trong effect) để không có
  // khung hình nào sidebar biến mất trước khi hiệu ứng thoát bắt đầu.
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    setIsExiting(!isOpen);
    if (isOpen) setIsEnterAnimated(shouldAnimateEnter);
  }

  useEffect(() => {
    if (!isExiting) return;
    const timer = window.setTimeout(() => setIsExiting(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [isExiting, exitMs]);

  return { isRendered: isOpen || isExiting, isClosing: !isOpen && isExiting, isEnterAnimated };
}
