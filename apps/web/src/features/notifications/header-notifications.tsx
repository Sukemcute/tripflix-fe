'use client';
import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useHeaderPopover } from '@/features/shared/use-header-popover';

/**
 * Nút chuông trên header (chỉ khi đã đăng nhập), bấm thả xuống bảng thông báo.
 * notification-service chưa có API thông báo trong app (TF46), nên bảng tạm hiện trạng thái trống.
 */
export function HeaderNotifications() {
  const { user, isReady } = useApiSession();
  const { isOpen, root, toggle, setOpen } = useHeaderPopover();
  if (!isReady || !user) return null;

  return (
    <div className="header-notifications" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="header-icon-button"
        aria-expanded={isOpen}
        aria-controls="header-notifications-panel"
        aria-label={vi.api.notificationsTitle}
        onClick={() => setOpen(!isOpen)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </svg>
      </button>
      {isOpen && (
        <div id="header-notifications-panel" className="header-popover header-notifications-panel">
          <div className="header-notifications-head">
            <strong>{vi.api.notificationsTitle}</strong>
          </div>
          <div className="header-notifications-empty">
            <span className="header-notifications-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
                <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
              </svg>
            </span>
            <strong>{vi.api.notificationsEmpty}</strong>
            <p>{vi.api.notificationsEmptyHint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
