'use client';
import { useApiSession } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { ADMIN_URL, getInitial, isStaffRole } from './account-helpers';

/**
 * Góc phải header: chưa đăng nhập thì link "Đăng nhập"; đã đăng nhập thì nút avatar + tên mở menu
 * (Tài khoản, Bài đăng của tôi, Trang quản trị cho nhân viên, Đăng xuất).
 * Menu là nhóm link bật/tắt (disclosure), chỉ render khi mở.
 */
export function HeaderAccount() {
  const { user, isReady, session } = useApiSession();
  const router = useRouter();
  const pathname = usePathname();
  // Lưu trang lúc mở menu: sang trang khác (kể cả Back/Forward) thì menu tự coi là đóng, không cần effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = openedAt === pathname;
  const setOpen = (open: boolean) => setOpenedAt(open ? pathname : null);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const logout = useMutation({
    mutationFn: () => session.logout(),
    onSuccess: () => {
      setOpen(false);
      router.push('/');
    },
  });

  // Bấm một mục thì đóng ngay: /account → /account?tab=mine không đổi pathname.
  const closeMenu = () => setOpen(false);
  // Bấm ra ngoài thì đóng; Esc thì đóng và trả focus về nút.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenedAt(null);
      toggle.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

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
        <span className="header-account-name">{user.displayName}</span>
        <span className="header-account-caret" aria-hidden="true" />
      </button>
      {isOpen && (
        <div id="header-account-menu" className="header-account-menu">
          <div className="header-account-who">
            <strong>{user.displayName}</strong>
            <span>{user.email}</span>
          </div>
          <ul>
            <li>
              <Link href="/account" onClick={closeMenu}>
                {vi.api.account}
              </Link>
            </li>
            <li>
              <Link href="/account?tab=mine" onClick={closeMenu}>
                {vi.api.myPosts}
              </Link>
            </li>
            {ADMIN_URL && isStaffRole(user.role) && (
              <li>
                <a href={ADMIN_URL} onClick={closeMenu}>
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
            {vi.api.logout}
          </button>
        </div>
      )}
    </div>
  );
}
