'use client';
import { useEffect, useState } from 'react';

/** Hồ sơ mới đến được tô sáng bấy lâu để mắt kịp bắt. */
export const FRESH_HIGHLIGHT_MS = 8_000;

/** Lần tải đầu (chưa thấy gì) không coi là mới; các lần sau, id chưa từng thấy là hồ sơ vừa đến. */
export function findArrivals(seen: ReadonlySet<string> | null, ids: readonly string[]): string[] {
  if (!seen) return [];
  return ids.filter((id) => !seen.has(id));
}

/**
 * Trả về các id vừa xuất hiện sau lần tải đầu (realtime hoặc polling làm mới hàng chờ).
 * `ids` phải giữ cùng tham chiếu khi dữ liệu không đổi (dùng useMemo theo dữ liệu query).
 */
export function useFreshIds(ids: readonly string[] | undefined, durationMs = FRESH_HIGHLIGHT_MS): ReadonlySet<string> {
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [trackedIds, setTrackedIds] = useState(ids);
  // Cập nhật ngay khi danh sách đổi (mẫu "điều chỉnh state khi prop đổi" của React), không cần effect.
  if (ids !== trackedIds) {
    setTrackedIds(ids);
    if (ids) {
      const arrivals = findArrivals(seen, ids);
      setSeen(new Set([...(seen ?? []), ...ids]));
      if (arrivals.length) setFresh(new Set([...fresh, ...arrivals]));
    }
  }
  useEffect(() => {
    if (!fresh.size) return;
    const timer = setTimeout(() => setFresh(new Set()), durationMs);
    return () => clearTimeout(timer);
  }, [fresh, durationMs]);
  return fresh;
}
