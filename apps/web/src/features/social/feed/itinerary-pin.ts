export type InspirationFeedTab = 'posts' | 'reels';

/** Chiều rộng tối thiểu (px) để tab Bài viết ghim cố định cột Lịch trình bên trái. */
export const PINNED_ITINERARY_MIN_WIDTH = 1200;

/** Media query dùng chung với CSS để tránh lệch mốc 1200px. */
export const PINNED_ITINERARY_QUERY = `(min-width: ${PINNED_ITINERARY_MIN_WIDTH}px)`;

/** Chỉ ghim cột Lịch trình khi đang xem tab Bài viết ở màn hình >= 1200px. */
export function isItineraryPinned(viewportWidth: number | null | undefined, view: InspirationFeedTab): boolean {
  return view === 'posts' && typeof viewportWidth === 'number' && Number.isFinite(viewportWidth) && viewportWidth >= PINNED_ITINERARY_MIN_WIDTH;
}

export interface TabItineraryOpenInput {
  view: InspirationFeedTab;
  isWideScreen: boolean;
  isPinnedWidth: boolean;
  postsChoice: boolean | null;
  reelsChoice: boolean | null;
}

/** Tính trạng thái mở cột Lịch trình riêng cho từng tab Bài viết và Reels. */
export function resolveTabItineraryOpen({
  view,
  isWideScreen,
  isPinnedWidth,
  postsChoice,
  reelsChoice,
}: TabItineraryOpenInput): boolean {
  if (view === 'reels') {
    return reelsChoice ?? false;
  }
  if (isPinnedWidth) {
    return true;
  }
  return postsChoice ?? isWideScreen;
}
