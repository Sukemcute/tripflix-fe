'use client';
import { useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/discovery/trip-card';
import { CheckoutError } from './checkout-error';
import { saveBookingCart, useBookingCart } from './cart-store';
import styles from './cart.module.css';
import { CartWarnings } from './cart-warnings';
import { useHoldCart } from './use-hold-cart';
import { BusyLabel, LoadingDots } from '@/features/shared/loading-dots';

const copy = vi.commerce;
const formatDate = (date: string) => date.split('-').reverse().join('/');

export function CartScreen() {
  const router = useRouter();
  const cart = useBookingCart();
  const { user, isReady } = useApiSession();
  const hold = useHoldCart(cart, saveBookingCart);

  // Chưa đăng nhập thì không được xem hay dùng giỏ hàng: chuyển thẳng về trang đăng nhập
  useEffect(() => {
    if (isReady && !user) {
      router.replace('/login?returnTo=%2Fcart');
    }
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <main className={`ota-container ${styles.page}`}>
        <LoadingDots isBlock />
      </main>
    );
  }

  const hasItems = cart.items.length > 0;
  const underCapacity = findUnderCapacityStays(cart);
  const surcharge = calculateBookingCartChildDiscount(cart);
  const lineTotals = listBookingCartLineTotals(cart);
  const total = calculateBookingCartTotal(cart);

  return (
    <main className={`ota-container ${styles.page}`}>
      <h1 className={styles.title}>{copy.cartTitle}</h1>
      <p className={styles.subtitle}>
        {hasItems ? `${countBookingCartGuests(cart)} ${copy.guests} · ${copy.cartNoHold}` : copy.cartEmptyCount}
      </p>
      <div className={styles.layout}>
        {hasItems ? (
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
        ) : (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M3 4h2l2.4 11h10.8L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9.5" cy="19.5" r="1.4" />
                <circle cx="17" cy="19.5" r="1.4" />
              </svg>
            </div>
            <h2>{copy.cartEmpty}</h2>
            <p>{copy.cartEmptyHint}</p>
            <Link className="primary-button" href="/search">
              {copy.findHotel}
            </Link>
          </div>
        )}

        <aside className={styles.summary}>
          <h2>{copy.cartSummaryTitle}</h2>
          {surcharge > 0 && (
            <p className={styles.surcharge}>
              <span>{copy.cartChildSurcharge}</span>
              <span>{formatPrice(surcharge)}</span>
            </p>
          )}
          <p className={styles.total}>
            <span>{copy.cartSubtotal}</span>
            <strong>{formatPrice(total)}</strong>
          </p>
          {hasItems && <CartWarnings cart={cart} />}
          <CheckoutError error={hold.error} />
          {isReady && !user ? (
            <Link className="primary-button" href="/login?returnTo=%2Fcart">
              {copy.login}
            </Link>
          ) : hasItems ? (
            <button
              type="button"
              className="primary-button"
              disabled={!isReady || hold.isPending || underCapacity.length > 0}
              onClick={() => hold.mutate()}
            >
              <BusyLabel isBusy={hold.isPending}>{copy.cartBook}</BusyLabel>
            </button>
          ) : (
            <p className={styles.summaryHint}>{copy.cartSummaryEmpty}</p>
          )}
        </aside>
      </div>
    </main>
  );
}
