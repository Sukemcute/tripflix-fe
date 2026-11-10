'use client';
import { useApiSession } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useHeaderPopover } from '@/features/shared/use-header-popover';
import { ADMIN_URL, getInitial, isStaffRole } from './account-helpers';

/**
 * Góc phải header: chưa đăng nhập thì link "Đăng nhập"; đã đăng nhập thì avatar tròn (chữ cái đầu của tên) mở menu
 * (Tài khoản, Chuyến đã đặt, Bài đăng của tôi, Trang quản trị cho nhân viên, Đăng xuất). Tên đầy đủ nằm trong menu
 * và aria-label. Menu là nhóm link bật/tắt (disclosure), chỉ render khi mở.
 */
// Icon nét mảnh 18px cho các mục menu tài khoản, cùng kiểu icon menu header (TF06P).
const MENU_ICONS = {
  account: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  bookings: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" />
      <path d="M14 7v10" strokeDasharray="1.5 2" />
    </>
  ),
  posts: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m4 15 4.5-4 4 3.5 2.5-2 5 4" />
      <circle cx="15.5" cy="8.5" r="1.3" />
    </>
  ),
  admin: <path d="M12 3.5 19 6v5.5c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" />,
  logout: (
    <>
      <path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14" />
      <path d="M10 12h10m-3.5-3.5L20 12l-3.5 3.5" />
    </>
  ),
} as const;

function MenuIcon({ name }: { name: keyof typeof MENU_ICONS }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      {MENU_ICONS[name]}
    </svg>
  );
}

export function HeaderAccount() {
  const { user, isReady, session } = useApiSession();
  const router = useRouter();
  const { isOpen, root, toggle, setOpen, close } = useHeaderPopover();
  const logout = useMutation({
    mutationFn: () => session.logout(),
    onSuccess: () => {
      setOpen(false);
      router.push('/');
    },
  });

  // Bấm một mục thì đóng ngay: /account → /account?tab=mine không đổi pathname.
  const closeMenu = close;

  // Đang tải phiên: giữ chỗ cùng kích thước để header không giật.
  if (!isReady) return <span className="header-account is-loading" aria-hidden="true" />;
  if (!user)
    return (
      <Link className="primary-button header-login" href="/login">
        {vi.api.login}
      </Link>
    );

  return (
    <div className="header-account" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="header-account-toggle"
        aria-expanded={isOpen}
        aria-controls="header-account-menu"
        aria-label={`${vi.api.accountMenu}: ${user.displayName}`}
        onClick={() => setOpen(!isOpen)}
      >
        <span className="header-account-avatar" aria-hidden="true">
          {getInitial(user.displayName)}
        </span>
      </button>
      {isOpen && (
        <div id="header-account-menu" className="header-account-menu">
          <div className="header-account-who">
            <span className="header-account-avatar is-large" aria-hidden="true">
              {getInitial(user.displayName)}
            </span>
            <div>
              <strong title={user.displayName}>{user.displayName}</strong>
              <span title={user.email}>{user.email}</span>
            </div>
          </div>
          <ul>
            <li>
              <Link href="/account" onClick={closeMenu}>
                <MenuIcon name="account" />
                {vi.api.account}
              </Link>
            </li>
            <li>
              <Link href="/account?tab=bookings" onClick={closeMenu}>
                <MenuIcon name="bookings" />
                {vi.commerce.booked}
              </Link>
            </li>
            <li>
              <Link href="/account?tab=mine" onClick={closeMenu}>
                <MenuIcon name="posts" />
                {vi.api.myPosts}
              </Link>
            </li>
            {ADMIN_URL && isStaffRole(user.role) && (
              <li>
                <a href={ADMIN_URL} onClick={closeMenu}>
                  <MenuIcon name="admin" />
                  {vi.api.openAdmin}
                </a>
              </li>
            )}
          </ul>
          <ApiErrorNotice error={logout.error} />
          <button
            type="button"
            className="header-account-logout"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <MenuIcon name="logout" />
            {vi.api.logout}
          </button>
        </div>
      )}
    </div>
  );
}
