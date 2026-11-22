import type { InboxNotification } from '@tripflix/api-client';

/** Chỉ báo mục mới sau lần tải đầu; tải lịch sử hoặc đổi tài khoản không bật lại thẻ cũ. */
export function createNotificationArrivals() {
  let owner: string | undefined;
  let initialized = false;
  let startedAt = 0;
  let seen = new Set<string>();
  const observe = (
    userId: string | undefined,
    items: InboxNotification[],
    now = Date.now(),
    options: { canPresent: boolean } = { canPresent: true },
  ): InboxNotification[] => {
    if (!userId || owner !== userId) {
      owner = userId;
      initialized = false;
      seen = new Set();
    }
    if (!userId) return [];
    if (!initialized) {
      initialized = true;
      startedAt = now;
      items.forEach((item) => seen.add(item.id));
      return [];
    }
    const arrivals: InboxNotification[] = [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      const createdAt = Date.parse(item.createdAt);
      if (item.readAt || !Number.isFinite(createdAt) || createdAt < startedAt || now - createdAt > 120_000) {
        seen.add(item.id);
      } else if (options.canPresent) {
        arrivals.push(item);
        seen.add(item.id);
      }
    }
    if (seen.size > 2000) seen = new Set([...seen].slice(-2000));
    return arrivals;
  };
  observe.defer = (userId: string, id: string) => {
    if (owner === userId) seen.delete(id);
  };
  return observe;
}
