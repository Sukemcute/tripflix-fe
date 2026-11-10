import { vi } from '@tripflix/i18n';
import { LegalPage } from './legal-page';

/** Trang chính sách bảo mật (/chinh-sach-bao-mat). */
export function PrivacyPage() {
  return <LegalPage copy={vi.privacy} idPrefix="privacy" />;
}
