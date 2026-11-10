import { useSyncExternalStore } from 'react';
import { EMPTY_BOOKING_CART, parseBookingCart, type BookingCart } from '@tripflix/app-core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Giỏ lưu bền để tắt app vẫn còn: web dùng localStorage, điện thoại dùng expo-secure-store có sẵn
// (không thêm thư viện). Phòng đang chọn ở trang khách sạn chỉ nằm trong bộ nhớ, giống sessionStorage của web.
// Hook khai báo ở cấp module: bộ biên dịch React không cho hook nằm trong hàm tạo store.
const CART_KEY = 'tripflix.bookingCart.v1';
type CartSlot = 'cart' | 'selection';
const carts: Record<CartSlot, BookingCart> = { cart: EMPTY_BOOKING_CART, selection: EMPTY_BOOKING_CART };
const listeners = new Set<() => void>();
const today = () => new Date().toISOString().slice(0, 10);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify(): void {
  listeners.forEach((listener) => listener());
}
async function readStoredCart(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CART_KEY) ?? null;
  return SecureStore.getItemAsync(CART_KEY);
}
async function writeStoredCart(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CART_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(CART_KEY, value);
}
function saveCart(slot: CartSlot, cart: BookingCart): void {
  carts[slot] = cart;
  notify();
  if (slot === 'cart') writeStoredCart(JSON.stringify(cart)).catch(() => undefined);
}

// Đọc giỏ đã lưu khi mở app; parseBookingCart bỏ mục hỏng hoặc đã qua ngày.
readStoredCart()
  .then((raw) => {
    if (carts.cart !== EMPTY_BOOKING_CART) return;
    carts.cart = parseBookingCart(raw, today());
    notify();
  })
  .catch(() => undefined);

export const saveBookingCart = (cart: BookingCart): void => saveCart('cart', cart);
export const saveBookingSelection = (cart: BookingCart): void => saveCart('selection', cart);
export function useBookingCart(): BookingCart {
  return useSyncExternalStore(subscribe, () => carts.cart, () => carts.cart);
}
export function useBookingSelection(): BookingCart {
  return useSyncExternalStore(subscribe, () => carts.selection, () => carts.selection);
}
