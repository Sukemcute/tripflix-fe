import type { ReelFeedTab } from '@tripflix/api-client';

export type ReelsTabSource = 'recommended' | 'feed';

/**
 * Dành cho bạn của người đăng nhập lấy từ discovery, để bài đã gợi ý ở phiên trước bị đẩy xuống (TF23).
 * Khách vẫn đọc feed: discovery không chống lặp cho khách và trả kiểu trending, trùng với tab Đang hot.
 * Đang hot luôn đọc feed (điểm trend_scores của TF111).
 */
export function getReelsTabSource(tab: ReelFeedTab, { isSignedIn }: { isSignedIn: boolean }): ReelsTabSource {
  return tab === 'for_you' && isSignedIn ? 'recommended' : 'feed';
}
