/**
 * Tham số URL của trang Cảm hứng: `q` là từ khoá đã chốt, `open` là bài đang mở từ grid kết quả,
 * `type` là tab kết quả (không có là Tất cả), `kind=reel` là bài đang mở là Reel (mở trình xem Reels),
 * `sort` là kiểu sắp xếp bài và Reels trong kết quả (không có là Liên quan nhất).
 */
export const SEARCH_QUERY_PARAM = 'q';
export const SEARCH_OPEN_PARAM = 'open';
export const SEARCH_TYPE_PARAM = 'type';
export const SEARCH_OPEN_KIND_PARAM = 'kind';
/** Bình luận cần nhảy tới trong bài đang mở (link từ thông báo). */
export const SEARCH_COMMENT_PARAM = 'comment';
export const SEARCH_SORT_PARAM = 'sort';

/** Khớp `sort` của POST /api/search/posts. */
export const SEARCH_SORTS = ['relevance', 'trending', 'recent'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/** Giá trị lạ hoặc thiếu thì về Liên quan nhất. */
export function parseSearchSort(value: string | null | undefined): SearchSort {
  return SEARCH_SORTS.find((sort) => sort === value) ?? 'relevance';
}

export const SEARCH_RESULT_TYPES = ['all', 'users', 'hotels', 'places', 'food', 'cafe', 'posts', 'reels'] as const;
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

/** Giá trị lạ hoặc thiếu thì về Tất cả. */
export function parseSearchResultType(value: string | null | undefined): SearchResultType {
  return SEARCH_RESULT_TYPES.find((type) => type === value) ?? 'all';
}

/** Tab chỗ, điểm → `kind` của POST /api/search/places; tab bài và Tất cả thì null. */
const PLACE_KIND_OF_TYPE = { hotels: 'stay', places: 'see', food: 'food', cafe: 'cafe' } as const;
export type PlaceResultType = keyof typeof PLACE_KIND_OF_TYPE;

export function getPlaceKind(type: SearchResultType): (typeof PLACE_KIND_OF_TYPE)[PlaceResultType] | null {
  return type in PLACE_KIND_OF_TYPE ? PLACE_KIND_OF_TYPE[type as PlaceResultType] : null;
}

/** Vùng của tab Tất cả (`kind` của ExploreSectionDto) → tab mà nút "Xem tất cả" mở; vùng lạ thì null. */
const RESULT_TYPE_OF_SECTION: Record<string, SearchResultType> = {
  user: 'users', stay: 'hotels', see: 'places', food: 'food', cafe: 'cafe', plan: 'posts', post: 'posts', video: 'reels',
};

export function getSectionResultType(sectionKind: string): SearchResultType | null {
  return RESULT_TYPE_OF_SECTION[sectionKind] ?? null;
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
  /** Kiểu sắp xếp bài trong kết quả; grid và bài mở từ grid dùng chung để cuộn đúng thứ tự đang xem. */
  sort?: SearchSort;
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
      params.delete(SEARCH_SORT_PARAM);
    }
    params.delete(SEARCH_OPEN_PARAM);
    params.delete(SEARCH_OPEN_KIND_PARAM);
    params.delete(SEARCH_COMMENT_PARAM);
  }
  if (changes.resultType !== undefined) {
    if (changes.resultType === 'all') params.delete(SEARCH_TYPE_PARAM);
    else params.set(SEARCH_TYPE_PARAM, changes.resultType);
  }
  if (changes.sort !== undefined) {
    if (changes.sort === 'relevance') params.delete(SEARCH_SORT_PARAM);
    else params.set(SEARCH_SORT_PARAM, changes.sort);
  }
  if (changes.openPostId !== undefined) {
    // Bình luận chỉ thuộc bài đang mở: đổi bài thì bỏ.
    if (changes.openPostId !== params.get(SEARCH_OPEN_PARAM)) params.delete(SEARCH_COMMENT_PARAM);
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

/** Đường dẫn mở một bài ở trang Cảm hứng: Reel mở trong trình xem Reels, commentId thì nhảy tới bình luận đó. */
export function buildPostHref(postId: string, options: { postType?: string; commentId?: string } = {}): string {
  const path = buildInspirationHref('/inspiration', '', { openPostId: postId, isOpenReel: options.postType === 'video' });
  return options.commentId ? `${path}&${SEARCH_COMMENT_PARAM}=${encodeURIComponent(options.commentId)}` : path;
}
