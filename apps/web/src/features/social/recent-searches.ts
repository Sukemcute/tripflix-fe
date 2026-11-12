/** Số từ khoá "Tìm gần đây" giữ lại trên máy. */
export const MAX_RECENT_SEARCHES = 10;
const RECENT_SEARCHES_STORAGE_KEY = 'tripflix:inspiration-recent-searches';

function toComparableKeyword(keyword: string): string {
  return keyword.trim().toLocaleLowerCase('vi');
}

/** Đưa từ khoá vừa tìm lên đầu; trùng (không phân biệt hoa thường) thì bỏ bản cũ; giữ tối đa `max` mục. */
export function pushRecentSearch(
  recentKeywords: readonly string[],
  keyword: string,
  max: number = MAX_RECENT_SEARCHES,
): string[] {
  const trimmed = keyword.trim();
  if (!trimmed) return [...recentKeywords];
  const key = toComparableKeyword(trimmed);
  return [trimmed, ...recentKeywords.filter((item) => toComparableKeyword(item) !== key)].slice(0, max);
}

export function removeRecentSearch(recentKeywords: readonly string[], keyword: string): string[] {
  const key = toComparableKeyword(keyword);
  return recentKeywords.filter((item) => toComparableKeyword(item) !== key);
}

/** Đọc từ localStorage; dữ liệu hỏng hoặc trình duyệt chặn bộ nhớ thì coi như chưa có. */
export function readRecentSearches(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function writeRecentSearches(recentKeywords: readonly string[]): void {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentKeywords));
  } catch {
    // Chế độ ẩn danh hoặc hết dung lượng: không lưu được thì thôi, tìm kiếm vẫn chạy bình thường.
  }
}
