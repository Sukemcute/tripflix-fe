'use client';
import { useState } from 'react';
import {
  addBookingCartItem,
  countBookingCartGuests,
  getBookingCartItemKey,
  setBookingCartItemQty,
  type BookingCartGuests,
  type BookingCartItem,
} from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { saveBookingSelection, useBookingSelection } from './cart-store';
import styles from './cart.module.css';

const copy = vi.commerce;

/** Chọn số phòng của một gói giá; số đã chọn nằm trong giỏ, chưa giữ chỗ. */
export function BookRateButton({
  booking,
  guests,
  isDisabled,
}: {
  booking: Omit<BookingCartItem, 'qty'>;
  guests: BookingCartGuests;
  isDisabled?: boolean;
}) {
  const cart = useBookingSelection();
  const [notice, setNotice] = useState('');
  const key = getBookingCartItemKey(booking);
  const line = cart.items.find((cartLine) => getBookingCartItemKey(cartLine) === key);

  const selectQty = (qty: number) => {
    if (line) {
      saveBookingSelection(setBookingCartItemQty(cart, key, qty));
      return;
    }
    if (qty === 0) return;
    const result = addBookingCartItem(cart, { ...booking, qty }, guests);
    if (result.outcome === 'adults_mismatch') {
      setNotice(`${copy.cartAdultsMismatch} ${countBookingCartGuests(cart)} ${copy.guests}.`);
      return;
    }
    if (result.outcome === 'full') {
      setNotice(copy.cartFull);
      return;
    }
    setNotice('');
    saveBookingSelection(result.cart);
  };

  return (
    <div className={styles.adder} data-selected={Boolean(line)}>
      <select
        className={styles.qtySelect}
        aria-label={copy.cartSelectRooms}
        value={line?.qty ?? 0}
        disabled={isDisabled}
        onChange={(event) => selectQty(Number(event.target.value))}
      >
        {Array.from({ length: booking.maxQty + 1 }, (_, qty) => (
          <option key={qty} value={qty}>
            {qty} {copy.cartRooms}
          </option>
        ))}
      </select>
      {notice && (
        <p role="alert" className={styles.warning}>
          {notice}
        </p>
      )}
    </div>
  );
}
