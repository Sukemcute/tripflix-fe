import type { InboxNotification } from '@tripflix/api-client';

/**
 * Nơi mở khi bấm thông báo. Thông báo đơn (đã thanh toán, đã huỷ) có orderId thì mở thẳng trang đơn,
 * kể cả thông báo cũ đã lưu link chung '/bookings'. Chỉ nhận đường dẫn web để nội dung inbox không chèn được URL lạ.
 */
export function resolveNotificationHref(
  notification: Pick<InboxNotification, 'link' | 'data'>,
): string | null {
  const orderId = notification.data.orderId;
  if (typeof orderId === 'string' && orderId) return `/checkout/${encodeURIComponent(orderId)}`;
  const { link } = notification;
  if (!link) return null;
  const isAppPath = link.startsWith('/') && !link.startsWith('//');
  return isAppPath || /^https?:\/\//i.test(link) ? link : null;
}
