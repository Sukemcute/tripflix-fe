'use client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ota-shell.module.css';

const NAVIGATION = [
  { href: '/', label: vi.ota.home },
  { href: '/search', label: vi.api.hotels },
  { href: '/inspiration', label: vi.api.inspiration },
] as const;

export function OtaNavigation() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label={vi.demo.common.explore}>
      {NAVIGATION.map(({ href, label }) => {
        const isActive =
          pathname === href ||
          (href === '/search' && pathname.startsWith('/hotels/')) ||
          (href === '/inspiration' && pathname.startsWith('/trips/'));
        return (
          <Link key={href} href={href} aria-current={isActive ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
