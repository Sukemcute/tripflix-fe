import { useEffect, useState } from 'react';

/** Khớp thời lượng hiệu ứng đóng sidebar trong CSS (sidebarExit*). */
export const SIDEBAR_EXIT_MS = 260;

/**
 * Giữ component thêm một nhịp sau khi đóng để kịp chạy hiệu ứng thoát, rồi mới gỡ khỏi DOM.
 * Mở thì hiện ngay. `isClosing` để gắn class hiệu ứng thoát.
 */
export function usePresence(
  isOpen: boolean,
  exitMs: number = SIDEBAR_EXIT_MS,
): { isRendered: boolean; isClosing: boolean } {
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  // Cập nhật ngay trong lúc render khi isOpen đổi (thay cho setState trong effect) để không có
  // khung hình nào sidebar biến mất trước khi hiệu ứng thoát bắt đầu.
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    setIsExiting(!isOpen);
  }

  useEffect(() => {
    if (!isExiting) return;
    const timer = window.setTimeout(() => setIsExiting(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [isExiting, exitMs]);

  return { isRendered: isOpen || isExiting, isClosing: !isOpen && isExiting };
}
