'use client';
import { useApiSession } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { ADMIN_URL } from './account-helpers';

/** Địa chỉ admin nhận mã. Mã nằm sau # nên không vào log máy chủ hay header Referer. */
export function getAdminHandoffUrl(adminUrl: string, code: string): string {
  return `${adminUrl.replace(/\/+$/, '')}/auth/handoff#code=${encodeURIComponent(code)}`;
}

/** Mở trang quản trị bằng phiên web: lấy mã dùng một lần rồi chuyển sang admin, không phải đăng nhập lại. */
export function useOpenAdmin() {
  const { session } = useApiSession();
  return useMutation({
    mutationFn: async () => {
      const code = await session.createAdminHandoff();
      window.location.assign(getAdminHandoffUrl(ADMIN_URL, code));
    },
  });
}
