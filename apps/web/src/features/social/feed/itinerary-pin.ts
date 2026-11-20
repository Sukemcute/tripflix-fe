export type InspirationFeedTab = 'posts' | 'reels';

/** Chiều rộng tối thiểu (px) để tab Bài viết ghim cố định cả hai cột bên (Lịch trình và Bình luận). */
export const PINNED_SIDEBARS_MIN_WIDTH = 1200;

/** Giữ tên xuất cũ cho code/test đang import; dùng chung mốc 1200px với PINNED_SIDEBARS_MIN_WIDTH. */
export const PINNED_ITINERARY_MIN_WIDTH = PINNED_SIDEBARS_MIN_WIDTH;

/** Media query dùng chung với CSS để tránh lệch mốc 1200px. */
export const PINNED_SIDEBARS_QUERY = `(min-width: ${PINNED_SIDEBARS_MIN_WIDTH}px)`;
export const PINNED_ITINERARY_QUERY = PINNED_SIDEBARS_QUERY;

/** Tab Bài viết từ 1200px trở lên luôn ghim cả cột Lịch trình và cột Bình luận; Reels và màn hẹp không ghim. */
export function areFeedSidebarsPinned(viewportWidth: number | null | undefined, view: InspirationFeedTab): boolean {
  return (
    view === 'posts' &&
    typeof viewportWidth === 'number' &&
    Number.isFinite(viewportWidth) &&
    viewportWidth >= PINNED_SIDEBARS_MIN_WIDTH
  );
}

/** Chỉ ghim cột Lịch trình khi đang xem tab Bài viết ở màn hình >= 1200px. */
export function isItineraryPinned(viewportWidth: number | null | undefined, view: InspirationFeedTab): boolean {
  return areFeedSidebarsPinned(viewportWidth, view);
}

/** Chỉ ghim cột Bình luận ở tab Bài viết khi màn hình >= 1200px; Reels vẫn bật/tắt như cũ. */
export function isCommentPinned(viewportWidth: number | null | undefined, view: InspirationFeedTab): boolean {
  return areFeedSidebarsPinned(viewportWidth, view);
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

/** Trạng thái mở cột Bình luận ở tab Bài viết: >= 1200px luôn mở, dưới 1200px giữ lựa chọn người dùng / isWideScreen. */
export function resolveFeedRightOpen(choice: boolean | null, isWideScreen: boolean, isPinned: boolean): boolean {
  return isPinned || (choice ?? isWideScreen);
}

export interface CommentToggleDecisionInput {
  isRightOpen: boolean;
  currentActivePostId: string | null | undefined;
  targetPostId: string;
  isPinned: boolean;
}

/** Khi đang ghim (>= 1200px), bấm lại nút bình luận của bài đang chọn không đóng panel. */
export function shouldCloseCommentOnToggle({
  isRightOpen,
  currentActivePostId,
  targetPostId,
  isPinned,
}: CommentToggleDecisionInput): boolean {
  return !isPinned && isRightOpen && currentActivePostId === targetPostId;
}
