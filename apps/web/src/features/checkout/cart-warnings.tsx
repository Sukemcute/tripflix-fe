'use client';
import { countBookingCartGuests, findUnderCapacityStays, type BookingCart } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import styles from './cart.module.css';

const copy = vi.commerce;

export function CartWarnings({ cart }: { cart: BookingCart }) {
  return findUnderCapacityStays(cart).map((stay) => (
    <p key={stay.propertyName} role="alert" className={styles.warning}>
      {stay.propertyName}:{' '}
      {stay.reason === 'adults'
        ? `${copy.cartNeedAdults} ${stay.rooms} ${copy.cartRooms}, ${cart.adults} ${copy.cartAdultsUnit}.`
        : `${copy.cartUnderCapacity} ${stay.capacity}/${countBookingCartGuests(cart)} ${copy.guests}.`}
    </p>
  ));
}
