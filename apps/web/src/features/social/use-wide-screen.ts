import { useSyncExternalStore } from 'react';

/** Từ mốc này trở lên đủ chỗ cho sidebar nằm cạnh nội dung; hẹp hơn thì sidebar mở thành bottom sheet. */
export const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

function subscribeWideScreen(onChange: () => void): () => void {
  const media = window.matchMedia(WIDE_SCREEN_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function readWideScreen(): boolean {
  return window.matchMedia(WIDE_SCREEN_QUERY).matches;
}

/**
 * Màn hình có đủ rộng để mở sẵn sidebar không. Server render coi như hẹp (đóng) để không lệch hydration
 * và không phủ bottom sheet lên màn hình nhỏ; trên màn rộng sidebar trượt ra ngay sau khi hydrate.
 */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribeWideScreen, readWideScreen, () => false);
}
