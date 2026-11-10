import type { ReactNode } from 'react';
import { AuthShell } from '@/features/auth/auth-shell';

/**
 * Khung chung của đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác thực email. Nằm ở layout nên khi chuyển
 * giữa các trang này, ảnh nền và cụm ảnh đứng yên, chỉ nội dung thẻ đổi (chiều cao thẻ co giãn mượt).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
