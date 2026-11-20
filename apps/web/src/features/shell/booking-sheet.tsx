'use client';
import { useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Import tương đối (không qua `@/`) để test của thanh đáy chạy được với Vitest của web.
import { useBookingCart } from '../checkout/cart-store';
import { useHeaderPopover } from '../shared/use-header-popover';
import { MobileTabIcon, type MobileTabIconName } from './mobile-tab-icons';
import styles from './mobile-tab-bar.module.css';

interface BookingLink {
  href: string;
  label: string;
  icon: MobileTabIconName;
  isCurrent: (pathname: string) => boolean;
}

const PUBLIC_LINKS: BookingLink[] = [
  {
    href: '/search',
    label: vi.api.hotels,
    icon: 'hotel',
    isCurrent: (pathname) => pathname === '/search' || pathname.startsWith('/hotels/'),
  },
  {
    href: '/flights',
    label: vi.flights.title,
    icon: 'flight',
    isCurrent: (pathname) => pathname === '/flights' || pathname.startsWith('/flights/'),
  },
];

/**
 * Mục "Đặt chỗ" của thanh đáy: bấm mở một bảng nhỏ ngay trên thanh (Khách sạn, Vé máy bay; đã đăng nhập thêm
 * Giỏ hàng có số món và Chuyến đã đặt). Đóng khi bấm ra ngoài, Esc, chọn mục hoặc sang trang khác.
 */
export function BookingSheet({ isActive }: { isActive: boolean }) {
  const pathname = usePathname();
  const { user } = useApiSession();
  const cart = useBookingCart();
  const { isOpen, root, toggle, setOpen, close } = useHeaderPopover();
  const cartCount = cart.items.length;
  const links: BookingLink[] = user
    ? [
        ...PUBLIC_LINKS,
        {
          href: '/cart',
          label: vi.commerce.cartTitle,
          icon: 'cart',
          isCurrent: (current) => current === '/cart',
        },
        {
          href: '/bookings',
          label: vi.api.bookedTripsMenu,
          icon: 'booking',
          isCurrent: (current) => current === '/bookings' || current.startsWith('/bookings/'),
        },
      ]
    : PUBLIC_LINKS;

  return (
    <div ref={root} className={styles.bookingRoot}>
      <button
        ref={toggle}
        type="button"
        className={`${styles.tab} ${isActive || isOpen ? styles.tabActive : ''}`}
        aria-expanded={isOpen}
        aria-controls="mobile-booking-sheet"
        onClick={() => setOpen(!isOpen)}
      >
        <MobileTabIcon name="booking" />
        <span>{vi.shell.tabBooking}</span>
      </button>
      {isOpen && (
        <nav id="mobile-booking-sheet" className={styles.sheet} aria-label={vi.shell.bookingSheetAria}>
          <ul>
            {links.map((link) => {
              const isCart = link.href === '/cart';
              return (
                <li key={link.href}>
                  <Link
                    prefetch={false}
                    href={link.href}
                    className={styles.sheetLink}
                    aria-current={link.isCurrent(pathname) ? 'page' : undefined}
                    aria-label={isCart ? t('shell.cartWithCount', { label: link.label, count: cartCount }) : undefined}
                    onClick={close}
                  >
                    <MobileTabIcon name={link.icon} />
                    <span>{link.label}</span>
                    {isCart && cartCount > 0 && (
                      <span className={styles.sheetCount} aria-hidden="true">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
