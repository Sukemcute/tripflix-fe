'use client';
import { useSyncExternalStore } from 'react';
import { EMPTY_BOOKING_CART, parseBookingCart, type BookingCart } from '@tripflix/app-core';

function createCartStore(storageKey: string, getStorage: () => Storage) {
  const listeners = new Set<() => void>();
  let snapshot: BookingCart | undefined;

  const read = (): BookingCart => {
    try {
      return parseBookingCart(getStorage().getItem(storageKey), new Date().toISOString().slice(0, 10));
    } catch {
      return EMPTY_BOOKING_CART;
    }
  };
  const getSnapshot = (): BookingCart => {
    snapshot ??= read();
    return snapshot;
  };
  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== storageKey) return;
    snapshot = read();
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void): (() => void) => {
    if (!listeners.size) window.addEventListener('storage', handleStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) window.removeEventListener('storage', handleStorage);
    };
  };
  const save = (cart: BookingCart): void => {
    snapshot = cart;
    try {
      getStorage().setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn dùng được đến khi tải lại trang.
    }
    listeners.forEach((listener) => listener());
  };
  const useCart = (): BookingCart => useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_BOOKING_CART);
  return { save, useCart };
}

const cartStore = createCartStore('tripflix.bookingCart.v1', () => window.localStorage);
// Phòng đang chọn chỉ sống trong phiên trình duyệt; bấm "Thêm vào giỏ" mới vào giỏ thật.
const selectionStore = createCartStore('tripflix.bookingSelection.v1', () => window.sessionStorage);

export const saveBookingCart = cartStore.save;
export const useBookingCart = cartStore.useCart;
export const saveBookingSelection = selectionStore.save;
export const useBookingSelection = selectionStore.useCart;
