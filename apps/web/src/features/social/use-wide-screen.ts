import { useSyncExternalStore } from 'react';
import { PINNED_ITINERARY_QUERY } from './feed/itinerary-pin';

/** Từ mốc này trở lên đủ chỗ cho sidebar nằm cạnh nội dung; hẹp hơn thì sidebar mở thành bottom sheet. */
export const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

function subscribeMediaQuery(query: string, onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * Màn hình có đủ rộng để mở sẵn sidebar không. Server render coi như hẹp (đóng) để không lệch hydration
 * và không phủ bottom sheet lên màn hình nhỏ; trên màn rộng sidebar trượt ra ngay sau khi hydrate.
 */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMediaQuery(WIDE_SCREEN_QUERY, onChange),
    () => window.matchMedia(WIDE_SCREEN_QUERY).matches,
    () => false,
  );
}

/** Màn hình từ 1200px trở lên để tab Bài viết ghim cố định cột Lịch trình (server coi như chưa biết bề rộng). */
export function useIsPinnedItineraryScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMediaQuery(PINNED_ITINERARY_QUERY, onChange),
    () => window.matchMedia(PINNED_ITINERARY_QUERY).matches,
    () => false,
  );
}

/**
 * Panel cạnh nội dung có đang mở không: người dùng đã bấm mở/đóng thì theo lựa chọn đó; chưa bấm thì mở sẵn
 * chỉ trên màn rộng (màn hẹp panel là bottom sheet, mở sẵn sẽ che hết nội dung).
 */
export function resolvePanelOpen(choice: boolean | null, isWideScreen: boolean): boolean {
  return choice ?? isWideScreen;
}
