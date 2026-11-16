import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { configureHttp, HttpError } from './http';
import { moderationApi } from './moderation';

beforeEach(() => configureHttp({ baseUrl: 'https://gateway.example', getAccessToken: () => 'test-token' }));
afterEach(() => vi.restoreAllMocks());
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

it('truyền token, trang và cancellation khi đọc quyết định/báo cáo cá nhân', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => json({ items: [], nextCursor: null }));
  const abort = new AbortController();
  await moderationApi.myDecisions(20, abort.signal);
  const [url, init] = fetch.mock.calls[0]!;
  expect(String(url)).toContain('/api/v1/me/moderation/decisions?limit=20&cursor=20');
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-token');
  expect(init?.signal).toBe(abort.signal);
  await moderationApi.myReports(40);
  expect(String(fetch.mock.calls[1]![0])).toContain('/api/v1/me/reports?limit=20&cursor=40');
});

it('gửi khiếu nại có idempotency key và encode decision ID', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'appeal' }, 201));
  await moderationApi.submitAppeal('a/b', 'Xem lại');
  const [url, init] = fetch.mock.calls[0]!;
  expect(String(url)).toContain('/decisions/a%2Fb/appeals');
  expect(new Headers(init?.headers).get('idempotency-key')).toBeTruthy();
  expect(JSON.parse(String(init?.body))).toEqual({ reason: 'Xem lại' });
});

it('giữ lỗi conflict của BE để giao diện không giả định đã xử lý thành công', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ message: 'Đã xử lý' }, 409));
  await expect(moderationApi.decideAppeal('appeal', 'overturned')).rejects.toBeInstanceOf(HttpError);
});

it('đọc số liệu kiểm duyệt tính ở server', async () => {
  const stats = {
    pendingTotal: 122,
    pendingUrgent: 32,
    pendingPosts: 100,
    pendingComments: 22,
    oldestPendingAt: null,
    autoHidden24h: 5,
    reports24h: 7,
    pendingAppeals: 1,
    failedScans: 0,
    deferredScans: 0,
    urgentSeverity: 80,
    generatedAt: '2026-11-14T00:00:00.000Z',
  };
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(stats));
  const abort = new AbortController();
  await expect(moderationApi.stats(abort.signal)).resolves.toEqual(stats);
  const [url, init] = fetch.mock.calls[0]!;
  expect(String(url)).toContain('/api/v1/admin/moderation/stats');
  expect(init?.signal).toBe(abort.signal);
});
