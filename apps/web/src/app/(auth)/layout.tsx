import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthShell } from '@/features/auth/auth-shell';
import { NOINDEX_ROBOTS } from '@/features/seo/page-metadata';

/** Đăng nhập, đăng ký, đặt lại mật khẩu: không cần lên kết quả tìm kiếm (TF112). */
export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

/**
 * Khung chung của đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác thực email. Nằm ở layout nên khi chuyển
 * giữa các trang này, ảnh nền và cụm ảnh đứng yên, chỉ nội dung thẻ đổi (chiều cao thẻ co giãn mượt).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
