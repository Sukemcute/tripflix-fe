'use client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useBookingCart } from './cart-store';
import styles from './cart.module.css';

export function CartLink() {
  const cart = useBookingCart();
  const count = cart.items.length;
  return (
    <Link className={styles.headerLink} href="/cart" aria-label={`${vi.commerce.cartTitle}: ${count}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 4h2l2.4 11h10.8L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="19.5" r="1.4" />
        <circle cx="17" cy="19.5" r="1.4" />
      </svg>
      {count > 0 && <span className={styles.headerCount}>{count}</span>}
    </Link>
  );
}
