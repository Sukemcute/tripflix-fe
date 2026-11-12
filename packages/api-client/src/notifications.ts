import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http, HttpError, type HttpResponse } from './http';
import { isNotificationsSocketConnected } from './notifications-realtime';
import { useApiSession } from './session';

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsPage {
  items: InboxNotification[];
  unreadCount: number;
  nextCursor: string | null;
}

export interface NotificationReadResult {
  unreadCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNotification(value: unknown): value is InboxNotification {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    (value.link === null || typeof value.link === 'string') &&
    isRecord(value.data) &&
    isTimestamp(value.createdAt) &&
    (value.readAt === null || isTimestamp(value.readAt))
  );
}

function isReadResult(value: unknown): value is NotificationReadResult {
  return isRecord(value) && Number.isInteger(value.unreadCount) && Number(value.unreadCount) >= 0;
}

async function markNotificationsRead(path: string, throughId?: string): Promise<NotificationReadResult> {
  const { data } = await http<HttpResponse<unknown>>(path, {
    method: 'POST',
    ...(throughId === undefined ? {} : {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ throughId }),
    }),
  });
  if (!isReadResult(data)) throw new Error('Unexpected notification read response');
  return data;
}

export const notificationsApi = {
  async list(cursor?: string, signal?: AbortSignal, limit = 20): Promise<NotificationsPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const { data } = await http<HttpResponse<unknown>>(`/notifications?${params}`, { signal });
    if (
      !isReadResult(data) ||
      !isRecord(data) ||
      !Array.isArray(data.items) ||
      !data.items.every(isNotification) ||
      (data.nextCursor !== null && typeof data.nextCursor !== 'string')
    )
      throw new Error('Unexpected notifications response');
    return { items: data.items, unreadCount: data.unreadCount, nextCursor: data.nextCursor };
  },
  markRead(id: string): Promise<NotificationReadResult> {
    return markNotificationsRead(`/notifications/${encodeURIComponent(id)}/read`);
  },
  markAllRead(throughId?: string): Promise<NotificationReadResult> {
    return markNotificationsRead('/notifications/read-all', throughId);
  },
};

const NOTIFICATIONS_POLL_MS = 30_000;
const MAX_NOTIFICATIONS_RETRIES = 2;

export function useNotifications() {
  const { user, isReady } = useApiSession();
  return useInfiniteQuery({
    queryKey: ['notifications', user?.id],
    enabled: isReady && !!user,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => notificationsApi.list(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Có socket /ws thì thông báo mới tự đến; chỉ poll khi socket chưa nối hoặc đã mất.
    refetchInterval: () => (isNotificationsSocketConnected(user?.id) ? false : NOTIFICATIONS_POLL_MS),
    refetchOnWindowFocus: true,
    retry: shouldRetryNotifications,
  });
}

/** Lỗi 4xx (404 khi service chưa chạy, 401, 403) gọi lại vẫn lỗi, nên chỉ thử lại lỗi mạng và 5xx. */
export function shouldRetryNotifications(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_NOTIFICATIONS_RETRIES;
}

export function useMarkNotificationRead() {
  const { user } = useApiSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useApiSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (throughId?: string) => notificationsApi.markAllRead(throughId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });
}
