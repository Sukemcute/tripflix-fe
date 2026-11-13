import { useSyncExternalStore } from 'react';
import { parseTripPlanSelection, type TripPlanOffer, type TripPlanSelection } from '@tripflix/app-core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SelectedTripBooking = TripPlanSelection;
const TRIP_KEY = 'tripflix.tripBooking.v1';
let selectedTrip: SelectedTripBooking | null = null;
let hasChanged = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify(): void {
  listeners.forEach((listener) => listener());
}
async function readStoredTrip(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TRIP_KEY) ?? null;
  return SecureStore.getItemAsync(TRIP_KEY);
}
async function writeStoredTrip(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TRIP_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(TRIP_KEY, value);
}
// Giống giỏ hàng: dùng localStorage trên web và SecureStore trên điện thoại.
// Không để kết quả đọc chậm ghi đè lộ trình vừa chọn hoặc vừa xoá.
readStoredTrip()
  .then((raw) => {
    if (hasChanged) return;
    selectedTrip = parseTripPlanSelection(raw);
    notify();
  })
  .catch(() => undefined);
let pendingWrite = Promise.resolve();
export function saveTripBooking(trip: SelectedTripBooking | null): void {
  hasChanged = true;
  selectedHotel = null;
  selectedTrip = trip;
  notify();
  // Ghi theo thứ tự để lựa chọn cuối cùng luôn thắng khi người dùng đổi nhanh.
  pendingWrite = pendingWrite.then(() => writeStoredTrip(JSON.stringify(trip))).catch(() => undefined);
}
export function useTripBooking(): SelectedTripBooking | null {
  return useSyncExternalStore(
    subscribe,
    () => selectedTrip,
    () => selectedTrip,
  );
}

type TripHotel = { id: string; name: string };
let selectedHotel: { key: string; hotel: TripHotel } | null = null;

/** Chỗ ở chỉ dùng cho bài đang đặt; đổi bài sẽ bỏ lựa chọn cũ. */
export function saveTripHotel(key: string, hotel: TripHotel): void {
  if (selectedTrip?.postId !== key) return;
  selectedHotel = { key, hotel };
  picks = { key: '', values: {} };
  notify();
}
export function useTripHotel(key: string): TripHotel | undefined {
  const selection = useSyncExternalStore(
    subscribe,
    () => selectedHotel,
    () => selectedHotel,
  );
  return selection?.key === key ? selection.hotel : undefined;
}

export type TripBookingOffer = TripPlanOffer & {
  date?: string;
  flightNumber?: string | null;
  departTime?: string | null;
  cabinName?: string;
  fareName?: string;
  roomName?: string;
  rateName?: string;
};
let picks: { key: string; values: Record<string, TripBookingOffer> } = { key: '', values: {} };

/** Giá chỉ dùng trong phiên và gắn với đúng bộ lọc của lộ trình. */
export function saveTripPick(key: string, id: string, offer: TripBookingOffer): void {
  picks = { key, values: { ...(picks.key === key ? picks.values : {}), [id]: offer } };
  notify();
}
export function useTripPicks() {
  return useSyncExternalStore(
    subscribe,
    () => picks,
    () => picks,
  );
}
