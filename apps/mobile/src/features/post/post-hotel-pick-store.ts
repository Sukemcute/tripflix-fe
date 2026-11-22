import { useSyncExternalStore } from 'react';

/**
 * Khách sạn và loại phòng người đăng chọn cho một điểm khách sạn của lộ trình (TF105).
 * Màn tìm khách sạn ghi khách sạn, màn chọn phòng ghi loại phòng; trình soạn đọc theo khoá của điểm.
 */
export interface PostHotelPick {
  key: string;
  hotelId: string;
  hotelName: string;
  productId?: string;
  ratePlanCode?: string;
  roomName?: string;
  rateName?: string;
  /** Giá cả kỳ ở của phòng vừa chọn; màn tự lên lộ trình cộng vào tổng (TF105). */
  totalPrice?: number;
}

let current: PostHotelPick | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function savePostHotel(key: string, hotel: { hotelId: string; hotelName: string }): void {
  current = { key, ...hotel };
  notify();
}

/** Loại phòng chỉ ghi khi đúng khách sạn vừa chọn cho điểm đó. */
export function savePostRoom(
  key: string,
  room: { productId: string; ratePlanCode: string; roomName: string; rateName: string; totalPrice?: number },
): void {
  if (!current || current.key !== key) return;
  current = { ...current, ...room };
  notify();
}

export function usePostHotelPick(): PostHotelPick | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

export function clearPostHotelPick(): void {
  current = null;
  notify();
}
