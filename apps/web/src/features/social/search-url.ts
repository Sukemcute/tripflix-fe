/**
 * Tham số URL của trang Cảm hứng: `q` là từ khoá đã chốt, `open` là bài đang mở từ grid kết quả,
 * `type` là tab kết quả (không có là Tất cả), `kind=reel` là bài đang mở là Reel (mở trình xem Reels).
 */
export const SEARCH_QUERY_PARAM = 'q';
export const SEARCH_OPEN_PARAM = 'open';
export const SEARCH_TYPE_PARAM = 'type';
export const SEARCH_OPEN_KIND_PARAM = 'kind';

export const SEARCH_RESULT_TYPES = ['all', 'posts', 'reels'] as const;
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

/** Giá trị lạ hoặc thiếu thì về Tất cả. */
export function parseSearchResultType(value: string | null | undefined): SearchResultType {
  return value === 'posts' || value === 'reels' ? value : 'all';
}

export interface InspirationUrlChanges {
  /** Từ khoá mới; rỗng hoặc null là thoát tìm kiếm (bỏ luôn bài đang mở). */
  keyword?: string | null;
  /** Bài mở từ grid; null là quay lại grid. */
  openPostId?: string | null;
  /** Bài mở là Reel: xem trong trình xem Reels thay vì tab Bài viết. Chỉ dùng cùng openPostId. */
  isOpenReel?: boolean;
  view?: 'posts' | 'reels';
  resultType?: SearchResultType;
}

/**
 * Dựng URL mới từ query hiện tại, giữ các tham số khác. Đổi từ khoá luôn bỏ bài đang mở để kết quả mới
 * hiện từ grid.
 */
export function buildInspirationHref(
  pathname: string,
  current: URLSearchParams | string,
  changes: InspirationUrlChanges,
): string {
  const params = new URLSearchParams(current.toString());
  if (changes.keyword !== undefined) {
    const keyword = changes.keyword?.trim() ?? '';
    if (keyword) {
      params.set(SEARCH_QUERY_PARAM, keyword);
    } else {
      params.delete(SEARCH_QUERY_PARAM);
      params.delete(SEARCH_TYPE_PARAM);
    }
    params.delete(SEARCH_OPEN_PARAM);
    params.delete(SEARCH_OPEN_KIND_PARAM);
  }
  if (changes.resultType !== undefined) {
    if (changes.resultType === 'all') params.delete(SEARCH_TYPE_PARAM);
    else params.set(SEARCH_TYPE_PARAM, changes.resultType);
  }
  if (changes.openPostId !== undefined) {
    if (changes.openPostId) params.set(SEARCH_OPEN_PARAM, changes.openPostId);
    else params.delete(SEARCH_OPEN_PARAM);
    if (changes.openPostId && changes.isOpenReel) params.set(SEARCH_OPEN_KIND_PARAM, 'reel');
    else params.delete(SEARCH_OPEN_KIND_PARAM);
  }
  if (changes.view === 'reels') params.set('view', 'reels');
  else if (changes.view === 'posts') params.delete('view');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
