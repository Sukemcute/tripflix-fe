import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import {
  notificationsApi,
  shouldRetryNotifications,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './notifications';

const hooks = vi.hoisted(() => ({
  session: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./session', () => ({ useApiSession: hooks.session }));
const socketState = vi.hoisted(() => ({ connectedUserId: null as string | null }));
vi.mock('./notifications-realtime', () => ({
  isNotificationsSocketConnected: (userId: string | undefined) =>
    !!userId && socketState.connectedUserId === userId,
}));
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: hooks.query,
  useMutation: hooks.mutation,
  useQueryClient: () => ({ invalidateQueries: hooks.invalidate }),
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const notification = {
  id: 'inbox-1',
  type: 'booking.paid',
  title: 'Đặt phòng thành công',
  body: 'Thanh toán đã được xác nhận.',
  link: '/trips/1',
  data: { bookingId: '1' },
  createdAt: '2026-11-12T01:00:00.000Z',
  readAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  configureHttp({ baseUrl: 'https://gateway.example/', getAccessToken: async () => 'test-session' });
  hooks.session.mockReturnValue({ isReady: true, user: { id: 'user-1' } });
});
afterEach(() => vi.restoreAllMocks());

it('loads authenticated inbox pages through the gateway with opaque cursors and cancellation', async () => {
  const page = { items: [notification], unreadCount: 1, nextCursor: 'next' };
  const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page));
  const controller = new AbortController();
  expect(await notificationsApi.list('opaque+/=', controller.signal, 5)).toEqual(page);
  const [url, init] = send.mock.calls[0]!;
  const parsedUrl = new URL(String(url));
  expect(parsedUrl.origin).toBe('https://gateway.example');
  expect(parsedUrl.pathname).toBe('/notifications');
  expect(Object.fromEntries(parsedUrl.searchParams)).toEqual({ cursor: 'opaque+/=', limit: '5' });
  expect(init?.signal).toBe(controller.signal);
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-session');
});

it.each(['booking.paid', 'booking.cancelled', 'future.event'])(
  'supports empty inboxes, read items, nullable links and type %s',
  async (type) => {
    const send = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ items: [], unreadCount: 0, nextCursor: null }))
      .mockResolvedValueOnce(
        json({
          items: [{ ...notification, type, link: null, readAt: notification.createdAt }],
          unreadCount: 0,
          nextCursor: null,
        }),
      );
    expect((await notificationsApi.list()).items).toEqual([]);
    expect(new URL(String(send.mock.calls[0]![0])).searchParams.has('cursor')).toBe(false);
    expect((await notificationsApi.list()).items[0]?.type).toBe(type);
  },
);

it('posts read actions with encoded IDs, authentication and idempotency keys', async () => {
  const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ unreadCount: 0 }));
  expect(await notificationsApi.markRead('id/with space')).toEqual({ unreadCount: 0 });
  expect(await notificationsApi.markAllRead()).toEqual({ unreadCount: 0 });
  expect(send.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    '/notifications/id%2Fwith%20space/read',
    '/notifications/read-all',
  ]);
  for (const [, init] of send.mock.calls) {
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-session');
    expect(new Headers(init?.headers).get('idempotency-key')).toBeTruthy();
  }
});

it('sends the newest seen notification as the read-all boundary', async () => {
  const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ unreadCount: 1 }));
  expect(await notificationsApi.markAllRead('newest-seen')).toEqual({ unreadCount: 1 });
  expect(send.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ throughId: 'newest-seen' }));
});

it('preserves HttpError failures for list and read actions', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ message: 'Unavailable' }, 503));
  await expect(notificationsApi.list()).rejects.toBeInstanceOf(HttpError);
  await expect(notificationsApi.markRead('1')).rejects.toMatchObject({ status: 503 });
  await expect(notificationsApi.markAllRead()).rejects.toBeInstanceOf(HttpError);
});

it.each([
  { items: null, unreadCount: 0, nextCursor: null },
  { items: [], unreadCount: -1, nextCursor: null },
  { items: [], unreadCount: 1.5, nextCursor: null },
  { items: [], unreadCount: 0 },
  { items: [{ ...notification, createdAt: 'invalid' }], unreadCount: 1, nextCursor: null },
  { items: [{ ...notification, data: [] }], unreadCount: 1, nextCursor: null },
  { items: [{ ...notification, readAt: 123 }], unreadCount: 1, nextCursor: null },
])('rejects malformed inbox responses: %j', async (page) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page));
  await expect(notificationsApi.list()).rejects.toThrow('Unexpected notifications response');
});

it('rejects malformed mutation responses', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ unreadCount: '0' }));
  await expect(notificationsApi.markAllRead()).rejects.toThrow('Unexpected notification read response');
});

it.each([
  { isReady: false, user: { id: 'user-1' }, enabled: false },
  { isReady: true, user: null, enabled: false },
  { isReady: true, user: { id: 'user-1' }, enabled: true },
])('gates polling on session readiness and login: %j', ({ isReady, user, enabled }) => {
  hooks.session.mockReturnValue({ isReady, user });
  useNotifications();
  expect(hooks.query).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: ['notifications', user?.id],
      enabled,
      refetchOnWindowFocus: true,
    }),
  );
});

it('chỉ poll 30 giây khi socket /ws chưa kết nối', () => {
  hooks.session.mockReturnValue({ isReady: true, user: { id: 'user-1' } });
  useNotifications();
  const { refetchInterval } = hooks.query.mock.lastCall![0] as { refetchInterval: () => number | false };
  socketState.connectedUserId = null;
  expect(refetchInterval()).toBe(30_000);
  socketState.connectedUserId = 'user-1';
  expect(refetchInterval()).toBe(false);
  socketState.connectedUserId = 'user-2';
  expect(refetchInterval()).toBe(30_000);
  socketState.connectedUserId = null;
});

it.each([
  { error: new HttpError(404, null), failureCount: 0, expected: false },
  { error: new HttpError(401, null), failureCount: 0, expected: false },
  { error: new HttpError(503, null), failureCount: 0, expected: true },
  { error: new HttpError(503, null), failureCount: 2, expected: false },
  { error: new TypeError('Failed to fetch'), failureCount: 1, expected: true },
])('không thử lại lỗi 4xx, thử tối đa 2 lần với lỗi mạng và 5xx: %j', ({ error, failureCount, expected }) => {
  expect(shouldRetryNotifications(failureCount, error)).toBe(expected);
});

it('invalidates the current user inbox after successful read mutations', async () => {
  useMarkNotificationRead();
  useMarkAllNotificationsRead();
  for (const [options] of hooks.mutation.mock.calls) {
    await options.onSuccess();
  }
  expect(hooks.invalidate).toHaveBeenCalledTimes(2);
  expect(hooks.invalidate).toHaveBeenCalledWith({ queryKey: ['notifications', 'user-1'] });
});
