'use client';
import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookingSheet } from './booking-sheet';
import { MobileTabIcon } from './mobile-tab-icons';
import { buildComposeHref, buildMeHref, findActiveMobileTab, isMobileTabBarHidden } from './mobile-tabs';
import styles from './mobile-tab-bar.module.css';

/**
 * Thanh điều hướng đáy trên điện thoại (TF98): Trang chủ · Đặt chỗ · ⊕ · Cảm hứng · Tôi.
 * Chỉ hiện dưới 768px bằng CSS (không dùng matchMedia) để server và client render giống nhau.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useApiSession();
  if (isMobileTabBarHidden(pathname)) return null;

  const userId = user?.id ?? null;
  const activeTab = findActiveMobileTab(pathname, userId);
  const tabClass = (isActive: boolean) => `${styles.tab} ${isActive ? styles.tabActive : ''}`;

  return (
    <nav className={styles.bar} aria-label={vi.shell.tabBarAria} data-mobile-tab-bar="">
      <Link prefetch={false} href="/" className={tabClass(activeTab === 'home')} aria-current={activeTab === 'home' ? 'page' : undefined}>
        <MobileTabIcon name="home" />
        <span>{vi.shell.tabHome}</span>
      </Link>
      <BookingSheet isActive={activeTab === 'booking'} />
      <button
        type="button"
        className={styles.createButton}
        aria-label={vi.shell.tabCreate}
        // Đọc query lúc bấm thay vì useSearchParams: hook đó ở layout gốc buộc mọi trang render phía client.
        onClick={() =>
          router.push(buildComposeHref({ pathname, search: window.location.search, isSignedIn: Boolean(user) }))
        }
      >
        <MobileTabIcon name="create" size={24} />
      </button>
      <Link
        prefetch={false}
        href="/inspiration"
        className={tabClass(activeTab === 'inspiration')}
        aria-current={activeTab === 'inspiration' ? 'page' : undefined}
      >
        <MobileTabIcon name="inspiration" />
        <span>{vi.shell.tabInspiration}</span>
      </Link>
      <Link
        prefetch={false}
        href={buildMeHref({ userId, pathname })}
        className={tabClass(activeTab === 'me')}
        aria-current={activeTab === 'me' ? 'page' : undefined}
      >
        <MobileTabIcon name="me" />
        <span>{vi.shell.tabMe}</span>
      </Link>
    </nav>
  );
}
