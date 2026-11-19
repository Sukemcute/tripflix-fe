import type { ReactNode } from 'react';
import { vi } from '@tripflix/i18n';

/**
 * Ba chấm màu nhảy thay cho chữ "Đang tải…"; trình đọc màn hình vẫn đọc chữ.
 * `isBlock`: tải cả trang/cả vùng — căn giữa trong khối cao cố định để không nhảy chỗ.
 */
export function LoadingDots({ label = vi.api.loading, isBlock = false }: { label?: string; isBlock?: boolean }) {
  const dots = (
    <span className="loading-dots">
      <span className="loading-dots-row" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="loading-dots-label">{label}</span>
    </span>
  );
  return isBlock ? <output className="loading-dots-block">{dots}</output> : dots;
}

/** Chữ trong nút: khi `isBusy` thì chữ ẩn đi nhưng vẫn giữ chỗ, ba chấm chồng lên, nút không đổi kích thước. */
export function BusyLabel({ isBusy, label, children }: { isBusy: boolean; label?: string; children: ReactNode }) {
  return (
    <span className="loading-dots-slot">
      <span className={isBusy ? 'loading-dots-slot-hidden' : undefined}>{children}</span>
      {isBusy && <LoadingDots label={label} />}
    </span>
  );
}
