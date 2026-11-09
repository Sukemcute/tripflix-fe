'use client';
import { useApiSession } from '@tripflix/api-client';
import {
  calculateBookingCartChildDiscount,
  calculateBookingCartTotal,
  countBookingCartGuests,
  findUnderCapacityStays,
  getBookingCartItemKey,
  listBookingCartLineTotals,
  setBookingCartItemQty,
} from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { formatPrice } from '@/features/discovery/trip-card';
import { CheckoutError } from './checkout-error';
import { saveBookingCart, useBookingCart } from './cart-store';
import styles from './cart.module.css';
import { useHoldCart } from './use-hold-cart';

const copy = vi.commerce;
const formatDate = (date: string) => date.split('-').reverse().join('/');

export function CartScreen() {
  const cart = useBookingCart();
  const { user, isReady } = useApiSession();
  const hold = useHoldCart(cart, saveBookingCart);

  if (!cart.items.length)
    return (
      <main className={`ota-container ${styles.page}`}>
        <h1>{copy.cartTitle}</h1>
        <p className="empty-state">{copy.cartEmpty}</p>
        <Link className="primary-button" href="/search">
          {copy.findHotel}
        </Link>
      </main>
    );

  const underCapacity = findUnderCapacityStays(cart);
  const surcharge = calculateBookingCartChildDiscount(cart);
  const lineTotals = listBookingCartLineTotals(cart);
  return (
    <main className={`ota-container ${styles.page}`}>
      <h1>{copy.cartTitle}</h1>
      <p className="muted">
        {countBookingCartGuests(cart)} {copy.guests} · {copy.cartNoHold}
      </p>
      <div className={styles.layout}>
        <ul className={styles.items}>
          {cart.items.map((line, lineIndex) => {
            const key = getBookingCartItemKey(line);
            const setQty = (qty: number) => saveBookingCart(setBookingCartItemQty(cart, key, qty));
            return (
              <li key={key} className={styles.item}>
                <div>
                  <p className={styles.property}>{line.propertyName}</p>
                  <h2>{line.roomName}</h2>
                  <p className="small muted">
                    {line.ratePlanName} · {formatDate(line.checkIn)} → {formatDate(line.checkOut)}
                  </p>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.stepper}>
                    <button type="button" aria-label={copy.cartDecrease} onClick={() => setQty(line.qty - 1)}>
                      −
                    </button>
                    <span>
                      {line.qty} {copy.cartRooms}
                    </span>
                    <button
                      type="button"
                      aria-label={copy.cartIncrease}
                      disabled={line.qty >= line.maxQty}
                      onClick={() => setQty(line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <b>{formatPrice(lineTotals[lineIndex] ?? 0)}</b>
                  <button type="button" className={styles.remove} onClick={() => setQty(0)}>
                    {copy.cartRemove}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className={styles.summary}>
          {surcharge > 0 && (
            <p className={styles.surcharge}>
              <span>{copy.cartChildSurcharge}</span>
              <span>{formatPrice(surcharge)}</span>
            </p>
          )}
          <p className={styles.total}>
            <span>{copy.cartSubtotal}</span>
            <strong>{formatPrice(calculateBookingCartTotal(cart))}</strong>
          </p>
          {underCapacity.map((stay) => (
            <p key={stay.propertyName} role="alert" className={styles.warning}>
              {stay.propertyName}: {copy.cartUnderCapacity} {stay.capacity}/{countBookingCartGuests(cart)} {copy.guests}.
            </p>
          ))}
          <CheckoutError error={hold.error} />
          {isReady && !user ? (
            <Link className="primary-button" href="/login?returnTo=%2Fcart">
              {copy.login}
            </Link>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={!isReady || hold.isPending || underCapacity.length > 0}
              onClick={() => hold.mutate()}
            >
              {hold.isPending ? vi.api.loading : copy.cartBook}
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}
