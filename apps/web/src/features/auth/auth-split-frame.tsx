'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Thẻ <main> của khung đăng nhập. Ghi data-mode theo trang hiện tại để CSS chạy hiệu ứng: sang /register thì thẻ
 * rộng ra, trượt sang trái cùng cụm ảnh và ảnh nền; về /login thì trượt ngược lại. Layout giữ nguyên khi chuyển
 * trang trong nhóm (auth), nên chỉ thuộc tính này đổi và transition chạy mượt.
 */
export function AuthSplitFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main
      id="content"
      className="auth-fullscreen auth-split"
      data-mode={pathname === '/register' ? 'register' : 'login'}
    >
      {children}
    </main>
  );
}
