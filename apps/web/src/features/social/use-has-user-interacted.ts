import { useSyncExternalStore } from 'react';

/** Dùng chung cho mọi component: một khi người dùng đã thao tác thì giữ nguyên, kể cả khi chuyển tab. */
let hasInteracted = false;
const listeners = new Set<() => void>();
const INTERACTION_EVENTS = ['pointerdown', 'keydown'] as const;

function markInteracted(): void {
  if (hasInteracted) return;
  hasInteracted = true;
  for (const event of INTERACTION_EVENTS) window.removeEventListener(event, markInteracted, true);
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!hasInteracted) {
    for (const event of INTERACTION_EVENTS) window.addEventListener(event, markInteracted, true);
  }
  return () => listeners.delete(onChange);
}

/**
 * Người dùng đã bấm, chạm hay gõ phím trên trang chưa. Dùng để chỉ chạy hiệu ứng đóng/mở bố cục khi chính
 * người dùng thao tác; thay đổi tự động lúc mới vào trang (biết màn rộng sau hydrate, dữ liệu tải xong)
 * thì hiện ngay đúng vị trí, không co giãn.
 */
export function useHasUserInteracted(): boolean {
  return useSyncExternalStore(subscribe, () => hasInteracted, () => false);
}
