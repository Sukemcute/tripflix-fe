/** Khổ màn có header gọn tự ẩn; trùng mốc với mobile-header.css (header-auto-hide.tsx dùng). */
export const MOBILE_HEADER_QUERY = '(max-width: 767px)';

/** Cuộn ít hơn mốc này (px) thì giữ nguyên, để header không giật khi tay rung hoặc cuộn quán tính. */
export const HEADER_SCROLL_THRESHOLD_PX = 8;

export interface HeaderVisibilityInput {
  /** Vị trí cuộn lần cuối header đổi trạng thái hoặc đi tiếp cùng chiều (mốc so sánh). */
  anchorY: number;
  currentY: number;
  isHidden: boolean;
  headerHeight: number;
  /** Đang mở menu trong header hoặc focus đang ở trong header: luôn hiện. */
  isPinned: boolean;
}

export interface HeaderVisibility {
  isHidden: boolean;
  anchorY: number;
}

/**
 * Tính trạng thái ẩn/hiện header sau một lần cuộn: chưa qua chiều cao header thì luôn hiện; cuộn xuống quá mốc
 * thì ẩn, cuộn lên quá mốc thì hiện; dao động nhỏ thì giữ nguyên.
 */
export function getNextHeaderVisibility(input: HeaderVisibilityInput): HeaderVisibility {
  const { anchorY, currentY, isHidden, headerHeight, isPinned } = input;
  if (isPinned || currentY <= headerHeight) return { isHidden: false, anchorY: currentY };
  const distance = currentY - anchorY;
  if (distance > HEADER_SCROLL_THRESHOLD_PX) return { isHidden: true, anchorY: currentY };
  if (distance < -HEADER_SCROLL_THRESHOLD_PX) return { isHidden: false, anchorY: currentY };
  // Đang đi tiếp cùng chiều với trạng thái hiện tại thì dời mốc theo, để đổi chiều chỉ cần quá mốc tính từ điểm quay đầu.
  const isSameDirection = isHidden ? distance > 0 : distance < 0;
  return { isHidden, anchorY: isSameDirection ? currentY : anchorY };
}
