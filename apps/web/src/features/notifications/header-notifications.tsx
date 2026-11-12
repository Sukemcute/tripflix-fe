'use client';
import {
  useApiSession,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationsRealtime,
} from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useHeaderPopover } from '@/features/shared/use-header-popover';

/**
 * Nút chuông trên header (chỉ khi đã đăng nhập), bấm thả xuống bảng thông báo.
 * Hộp thư notification-service tự làm mới để cập nhật số thông báo chưa đọc (TF46).
 */
export function HeaderNotifications() {
  const { user, isReady } = useApiSession();
  const { isOpen, root, toggle, setOpen } = useHeaderPopover();
  const notifications = useNotifications();
  // Có thông báo mới thì tải lại ngay qua /ws; lượt tải 30 giây vẫn giữ để phòng mất kết nối.
  useNotificationsRealtime();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.data?.pages[0]?.unreadCount ?? 0;
  const latestSeenId = notifications.data?.pages[0]?.items[0]?.id;
  const items = [
    ...new Map(
      (notifications.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item]),
    ).values(),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  if (!isReady || !user) return null;

  return (
    <div className="header-notifications" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="header-icon-button"
        aria-expanded={isOpen}
        aria-controls="header-notifications-panel"
        aria-label={`${vi.api.notificationsTitle}, ${t('api.notificationsUnreadCount', { count: unreadCount })}`}
        onClick={() => setOpen(!isOpen)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="header-notifications-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div id="header-notifications-panel" className="header-popover header-notifications-panel">
          <div className="header-notifications-head">
            <strong>{vi.api.notificationsTitle}</strong>
            {unreadCount > 0 && latestSeenId && (
              <button
                type="button"
                className="header-notifications-read-all"
                disabled={markAllRead.isPending || markRead.isPending}
                onClick={() => markAllRead.mutate(latestSeenId)}
              >
                {vi.api.notificationsMarkAllRead}
              </button>
            )}
          </div>
          {notifications.isPending && (
            <output className="header-notifications-status">{vi.api.notificationsLoading}</output>
          )}
          <ApiErrorNotice error={notifications.error} retry={() => void notifications.refetch()} />
          <ApiErrorNotice
            error={markRead.error}
            retry={() => {
              if (markRead.variables !== undefined) markRead.mutate(markRead.variables);
            }}
          />
          <ApiErrorNotice
            error={markAllRead.error}
            retry={() => {
              if (markAllRead.variables !== undefined) markAllRead.mutate(markAllRead.variables);
            }}
          />
          {items.length > 0 && (
            <ul className="header-notifications-list">
              {items.map((item) => {
                const content = (
                  <>
                    {!item.readAt && (
                      <svg className="header-notifications-dot" viewBox="0 0 8 8">
                        <title>{vi.api.notificationsUnread}</title>
                        <circle cx="4" cy="4" r="4" fill="currentColor" />
                      </svg>
                    )}
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>
                  </>
                );
                const className = `header-notifications-item${item.readAt ? '' : ' is-unread'}`;
                const handleRead = () => {
                  if (!item.readAt) markRead.mutate(item.id);
                };
                // Only web URLs can be destinations supplied by inbox content.
                const href =
                  item.link &&
                  ((item.link.startsWith('/') && !item.link.startsWith('//')) ||
                    /^https?:\/\//i.test(item.link))
                    ? item.link
                    : null;
                return (
                  <li key={item.id}>
                    {href ? (
                      <Link
                        href={href}
                        prefetch={false}
                        className={className}
                        onClick={() => {
                          handleRead();
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={className}
                        disabled={markRead.isPending || markAllRead.isPending}
                        onClick={handleRead}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {notifications.hasNextPage && (
            <button
              type="button"
              className="header-notifications-more"
              disabled={notifications.isFetching}
              onClick={() => void notifications.fetchNextPage()}
            >
              {notifications.isFetchingNextPage ? vi.api.notificationsLoading : vi.api.next}
            </button>
          )}
          {notifications.isSuccess && items.length === 0 && (
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
          )}
        </div>
      )}
    </div>
  );
}
