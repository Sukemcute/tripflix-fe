import { vi } from '@tripflix/i18n';

/** Ba chấm màu nhảy thay cho chữ "Đang tải…"; trình đọc màn hình vẫn đọc chữ. */
export function LoadingDots({ label = vi.api.loading }: { label?: string }) {
  return (
    <span className="loading-dots">
      <span className="loading-dots-row" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="loading-dots-label">{label}</span>
    </span>
  );
}
