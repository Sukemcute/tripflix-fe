'use client';
import { vi } from '@tripflix/i18n';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';
import styles from './ota-shell.module.css';

// Icon nét mảnh 20px cho từng mục menu header (TF06P), vẽ bằng currentColor để đổi màu theo trạng thái.
const ICONS = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  hotel: (
    <>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v2M21 18v2" />
      <path d="M7 12h3" />
    </>
  ),
  flight: (
    <path d="m3 14 7-2 4-7.5a1.2 1.2 0 0 1 2 .6L15 12l5 1.5a1 1 0 0 1 .3 1.8l-2.3 1.2-6-1-3.5 4H7l1.5-4L4 15z" />
  ),
  inspiration: <path d="M12 3.5 13.8 9l5.7.3-4.4 3.6 1.5 5.6L12 15.4l-4.6 3.1 1.5-5.6-4.4-3.6L10.2 9z" />,
} as const;

const NAVIGATION = [
  { href: '/', label: vi.ota.home, icon: ICONS.home },
  { href: '/search', label: vi.api.hotels, icon: ICONS.hotel },
  { href: '/flights', label: vi.flights.title, icon: ICONS.flight },
  { href: '/inspiration', label: vi.api.inspiration, icon: ICONS.inspiration },
] as const;

function matches(href: string, pathname: string) {
  return (
    pathname === href ||
    (href === '/search' && pathname.startsWith('/hotels/')) ||
    (href === '/inspiration' && pathname.startsWith('/trips/'))
  );
}

// Nằm trong Link để đọc trạng thái chuyển trang: mục vừa bấm hiện viên "đang tải" cho tới khi trang mới hiện,
// mục cũ giữ màu cam để hai bên đổi cùng lúc (TF06P).
function NavItemContent({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className={styles.navItem} data-pending={pending || undefined}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
        {icon}
      </svg>
      {label}
    </span>
  );
}

export function OtaNavigation() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label={vi.demo.common.explore}>
      {NAVIGATION.map(({ href, label, icon }) => (
        <Link prefetch={false} key={href} href={href} aria-current={matches(href, pathname) ? 'page' : undefined}>
          <NavItemContent icon={icon} label={label} />
        </Link>
      ))}
    </nav>
  );
}
