'use client';
import {
  useApiSession,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationsRealtime,
} from '@tripflix/api-client';
import { isSameLocalDay } from '@tripflix/app-core';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useHeaderPopover } from '@/features/shared/use-header-popover';
import { getAvatarTone } from '../social/avatar-tone';
import { resolveNotificationHref } from './notification-href';
import { formatNotificationTime, getNotificationKind } from './notification-look';

const TRIPFLIX_ICON = '/brand/tripflix-gmail-avatar-icon.svg';
const KIND_ICON_PATHS = {
  comment: 'M4 5h16v11H9l-5 4z',
  reaction: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  follow: 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6',
} as const;

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
  // Mở chuông là coi như đã xem hết (số trên chuông về 0); các dòng chưa đọc lúc mở vẫn nổi bật tới lần mở sau.
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set());
  // Mốc "bây giờ" là lúc tải danh sách để chữ "5 phút trước" không nhảy mỗi lần render.
  const now = new Date(notifications.dataUpdatedAt);
  const sections = [
    {
      title: vi.api.notificationsToday,
      items: items.filter((item) => isSameLocalDay(new Date(item.createdAt), now)),
    },
    {
      title: vi.api.notificationsEarlier,
      items: items.filter((item) => !isSameLocalDay(new Date(item.createdAt), now)),
    },
  ].filter((section) => section.items.length > 0);
  if (!isReady || !user) return null;

  const openPanel = () => {
    setFreshIds(new Set(items.filter((item) => !item.readAt).map((item) => item.id)));
    if (unreadCount > 0 && latestSeenId) markAllRead.mutate(latestSeenId);
    setOpen(true);
  };

  return (
    <div className="header-notifications" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="header-icon-button"
        aria-expanded={isOpen}
        aria-controls="header-notifications-panel"
        aria-label={`${vi.api.notificationsTitle}, ${t('api.notificationsUnreadCount', { count: unreadCount })}`}
        onClick={() => (isOpen ? setOpen(false) : openPanel())}
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
          <div className="header-notifications-body">
            {sections.map((section) => (
              <section key={section.title} className="header-notifications-section">
                <h3>{section.title}</h3>
                <ul className="header-notifications-list">
                  {section.items.map((item) => {
                    const kind = getNotificationKind(item.type);
                    const isUnread = freshIds.has(item.id) || !item.readAt;
                    const content = (
                      <>
                        <span
                          className="header-notifications-avatar"
                          data-tone={kind === 'tripflix' ? undefined : getAvatarTone(item.body.split(' ')[0])}
                        >
                          {kind === 'tripflix' ? (
                            <Image
                              src={TRIPFLIX_ICON}
                              alt={vi.api.notificationsFromTripflix}
                              width={44}
                              height={44}
                            />
                          ) : (
                            <span aria-hidden="true">{item.body.trim().charAt(0).toUpperCase()}</span>
                          )}
                          {kind !== 'tripflix' && (
                            <span className="header-notifications-kind" data-kind={kind} aria-hidden="true">
                              <svg viewBox="0 0 24 24" width="12" height="12">
                                <path d={KIND_ICON_PATHS[kind]} />
                              </svg>
                            </span>
                          )}
                        </span>
                        <span className="header-notifications-text">
                          <strong>{item.title}</strong>
                          <span>{item.body}</span>
                          <time
                            dateTime={item.createdAt}
                            title={new Date(item.createdAt).toLocaleString('vi-VN')}
                          >
                            {formatNotificationTime(new Date(item.createdAt), now)}
                          </time>
                        </span>
                        {isUnread && (
                          <svg className="header-notifications-dot" viewBox="0 0 8 8">
                            <title>{vi.api.notificationsUnread}</title>
                            <circle cx="4" cy="4" r="4" fill="currentColor" />
                          </svg>
                        )}
                      </>
                    );
                    const className = `header-notifications-item${isUnread ? ' is-unread' : ''}`;
                    const handleRead = () => {
                      if (!item.readAt) markRead.mutate(item.id);
                      setFreshIds((ids) => new Set([...ids].filter((id) => id !== item.id)));
                    };
                    const href = resolveNotificationHref(item);
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
                            disabled={markRead.isPending}
                            onClick={handleRead}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
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
