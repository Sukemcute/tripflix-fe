import { vi } from '@tripflix/i18n';
import { LegalPage } from './legal-page';

/** Trang điều khoản sử dụng (/dieu-khoan-su-dung), người dùng đồng ý khi đăng ký (TF06O). */
export function TermsPage() {
  return <LegalPage copy={vi.terms} idPrefix="terms" />;
}
