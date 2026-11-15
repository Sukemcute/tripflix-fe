import { buildInspirationHref } from './search-url';

/** Kênh chia sẻ mở trang ngoài; "copy" và "native" (hộp chia sẻ của máy) xử lý riêng trong menu. */
export type ShareChannel = 'facebook' | 'x' | 'email';

/**
 * Link chia sẻ bài: trang Cảm hứng mở sẵn bài; Reel thêm kind=reel để mở trong trình xem Reels.
 * Cùng dạng với shareUrl của BE (`PostShareLinks`), chỉ khác lấy địa chỉ web từ trang đang mở.
 */
export function buildPostShareUrl(origin: string, postId: string, postType: string): string {
  const path = buildInspirationHref('/inspiration', '', { openPostId: postId, isOpenReel: postType === 'video' });
  return `${origin.replace(/\/+$/, '')}${path}`;
}

/** Link mở trang chia sẻ của từng mạng xã hội (không cần app id). */
export function buildShareChannelUrl(channel: ShareChannel, shareUrl: string, title: string): string {
  const url = encodeURIComponent(shareUrl);
  const text = encodeURIComponent(title);
  if (channel === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  if (channel === 'x') return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  return `mailto:?subject=${text}&body=${url}`;
}

export interface ShareMenuPlacementInput {
  anchor: { top: number; bottom: number; left: number; right: number };
  menu: { width: number; height: number };
  viewport: { width: number; height: number };
  /** Reels: cột nút ở mép phải khung video nên mở sang trái; thẻ bài viết mở phía trên nút. */
  side: 'left' | 'above';
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 10;

/** Toạ độ menu (top layer, theo khung nhìn): ưu tiên phía đã chọn, luôn nằm trọn trong khung nhìn. */
export function placeShareMenu({ anchor, menu, viewport, side }: ShareMenuPlacementInput): { left: number; top: number } {
  const clamp = (value: number, size: number, limit: number) =>
    Math.max(VIEWPORT_MARGIN, Math.min(value, limit - size - VIEWPORT_MARGIN));
  if (side === 'left') {
    const anchorMiddle = (anchor.top + anchor.bottom) / 2;
    return {
      left: clamp(anchor.left - ANCHOR_GAP - menu.width, menu.width, viewport.width),
      top: clamp(anchorMiddle - menu.height / 2, menu.height, viewport.height),
    };
  }
  // Không đủ chỗ phía trên (nút sát mép trên) thì mở xuống dưới.
  const above = anchor.top - ANCHOR_GAP - menu.height;
  const top = above >= VIEWPORT_MARGIN ? above : anchor.bottom + ANCHOR_GAP;
  return {
    left: clamp(anchor.left, menu.width, viewport.width),
    top: clamp(top, menu.height, viewport.height),
  };
}
