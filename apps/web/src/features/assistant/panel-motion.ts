/** Thời lượng hiệu ứng mở/đóng khung Tripi (150–200ms, ease-out). */
export const PANEL_OPEN_MS = 180;
export const PANEL_CLOSE_MS = 180;

/** Khoảng đệm chờ CSS animationend trước khi timer dự phòng gỡ component. */
export const PANEL_CLOSE_FALLBACK_BUFFER_MS = 60;

export interface PanelPresenceState {
  lastIsOpen: boolean;
  isExiting: boolean;
}

/**
 * Cập nhật trạng thái giữ panel trong lúc chạy hiệu ứng đóng.
 * Mở lại khi đang đóng sẽ huỷ thoát và chuyển thẳng về trạng thái mở.
 */
export function reducePanelPresence(
  state: PanelPresenceState,
  isOpen: boolean,
): PanelPresenceState {
  if (state.lastIsOpen === isOpen) return state;
  return {
    lastIsOpen: isOpen,
    isExiting: !isOpen,
  };
}

export function getPanelVisibility(isOpen: boolean, isExiting: boolean): {
  isClosing: boolean;
  rendered: boolean;
} {
  return {
    isClosing: !isOpen && isExiting,
    rendered: isOpen || isExiting,
  };
}

/**
 * Thời gian chờ dự phòng trước khi unmount nếu `onAnimationEnd` không bắn.
 * Khi bật `prefers-reduced-motion: reduce` thì gỡ ngay (0ms).
 */
export function getPanelCloseTimeoutMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : PANEL_CLOSE_MS + PANEL_CLOSE_FALLBACK_BUFFER_MS;
}

/** Chỉ kết thúc đóng khi animationend đến từ chính thẻ panel và đang ở trạng thái đóng. */
export function shouldCompletePanelClose(
  target: unknown,
  currentTarget: unknown,
  isClosing: boolean,
): boolean {
  return isClosing && target === currentTarget;
}
