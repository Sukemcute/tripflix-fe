'use client';
import { useState } from 'react';
import { useApiSession } from '@tripflix/api-client';
import {
  calculateBookingCartChildDiscount,
  calculateBookingCartTotal,
  countBookingCartGuests,
  EMPTY_BOOKING_CART,
  findUnderCapacityStays,
  listBookingCartStays,
  mergeBookingCart,
} from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatPrice } from '@/features/discovery/trip-card';
import { CheckoutError } from './checkout-error';
import { saveBookingCart, saveBookingSelection, useBookingCart, useBookingSelection } from './cart-store';
import styles from './cart.module.css';
import { CartWarnings } from './cart-warnings';
import { useHoldCart } from './use-hold-cart';

const copy = vi.commerce;
const formatDate = (date: string) => date.split('-').reverse().slice(0, 2).join('/');

/** Thanh ở đáy trang khách sạn: các phòng đang chọn trong phiên, chưa vào giỏ. */
export function CartBar() {
  const selection = useBookingSelection();
  const cart = useBookingCart();
  const hold = useHoldCart(selection, saveBookingSelection);
  const { user, isReady } = useApiSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  // Chọn phòng mới thì báo "đã thêm" của lần trước không còn đúng nữa.
  if (isAdded && selection.items.length) setIsAdded(false);

  if (!selection.items.length) {
    if (!isAdded) return null;
    return (
      <>
        <div className={styles.barSpacer} aria-hidden="true" />
        <div className={styles.bar} role="status">
          <div className={`ota-container ${styles.barContent}`}>
            <span className={styles.barAdded}>✓ {copy.cartAdded}</span>
            <Link className="secondary-button" href="/cart">
              {copy.cartView}
            </Link>
          </div>
        </div>
      </>
    );
  }

  const addToCart = () => {
    const result = mergeBookingCart(cart, selection);
    if (result.outcome === 'added') {
      saveBookingCart(result.cart);
      saveBookingSelection(EMPTY_BOOKING_CART);
      setNotice('');
      setIsAdded(true);
      return;
    }
    setNotice(
      result.outcome === 'full'
        ? copy.cartFull
        : `${copy.cartAdultsMismatch} ${countBookingCartGuests(cart)} ${copy.guests}.`,
    );
  };

  const roomCount = selection.items.reduce((sum, line) => sum + line.qty, 0);
  const underCapacity = findUnderCapacityStays(selection);
  const surcharge = calculateBookingCartChildDiscount(selection);
  const returnTo = `${pathname}?${searchParams.toString()}`;
  const isBlocked = underCapacity.length > 0;
  return (
    <>
      <div className={styles.barSpacer} aria-hidden="true" />
      <div className={styles.bar} role="region" aria-label={copy.cartTitle}>
        <div className={`ota-container ${styles.barContent}`}>
          <div className={styles.barSummary}>
            <span>
              {roomCount} {copy.cartRooms} · {copy.cartSubtotal}
            </span>
            <strong>{formatPrice(calculateBookingCartTotal(selection))}</strong>
            {surcharge > 0 && (
              <span>
                {copy.cartChildSurcharge} {formatPrice(surcharge)}
              </span>
            )}
            <ul className={styles.barStays}>
              {listBookingCartStays(selection).map((stay) => (
                <li key={stay.key}>
                  {stay.propertyName} · {formatDate(stay.checkIn)} → {formatDate(stay.checkOut)} · {stay.rooms}{' '}
                  {copy.cartRooms}
                </li>
              ))}
            </ul>
            <CartWarnings cart={selection} />
            {notice && (
              <p role="alert" className={styles.warning}>
                {notice}
              </p>
            )}
            <CheckoutError error={hold.error} />
          </div>
          <div className={styles.barActions}>
            <button
              type="button"
              className={styles.barClear}
              onClick={() => {
                saveBookingSelection(EMPTY_BOOKING_CART);
                setNotice('');
              }}
            >
              {copy.cartClearSelection}
            </button>
            <button type="button" className="secondary-button" disabled={isBlocked} onClick={addToCart}>
              {copy.cartAdd}
            </button>
            {isReady && !user ? (
              <Link className="primary-button" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
                {copy.login}
              </Link>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={!isReady || hold.isPending || isBlocked}
                onClick={() => hold.mutate()}
              >
                {hold.isPending ? vi.api.loading : copy.cartBook}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
