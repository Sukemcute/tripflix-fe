import { afterEach, expect, it, vi } from 'vitest';
import { configureHttp } from './http';
import {
  buildPlaybackCookieHeader,
  getPlaybackSessionRefreshDelayMs,
  PLAYBACK_SESSION_REFRESH_MARGIN_MS,
  playbackSessionApi,
} from './playback-session';

afterEach(() => vi.restoreAllMocks());

it('ghép cookie CloudFront thành một header Cookie, giữ nguyên ký tự ~ _ -', () => {
  expect(
    buildPlaybackCookieHeader({ 'CloudFront-Policy': 'eyJ-_~', 'CloudFront-Signature': 'c2ln', 'CloudFront-Key-Pair-Id': 'K2' }),
  ).toBe('CloudFront-Policy=eyJ-_~; CloudFront-Signature=c2ln; CloudFront-Key-Pair-Id=K2');
});

it('BE chưa bật ký cookie thì không gắn header', () => {
  expect(buildPlaybackCookieHeader({})).toBeNull();
});

it('xin lại trước khi hết hạn 30 phút, không dày hơn 1 phút, không xin lại khi cookie không có hạn', () => {
  const now = Date.parse('2026-11-17T06:00:00.000Z');
  expect(getPlaybackSessionRefreshDelayMs('2026-11-17T12:00:00.000Z', now)).toBe(6 * 3600_000 - PLAYBACK_SESSION_REFRESH_MARGIN_MS);
  expect(getPlaybackSessionRefreshDelayMs('2026-11-17T06:10:00.000Z', now)).toBe(60_000);
  expect(getPlaybackSessionRefreshDelayMs('không phải ngày', now)).toBe(60_000);
  expect(getPlaybackSessionRefreshDelayMs(null, now)).toBeNull();
});

it('gọi POST /api/media/playback-session, không cần đăng nhập', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ cookies: { 'CloudFront-Signature': 'c2ln' }, expiresAt: '2026-11-17T12:00:00.000Z' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  await expect(playbackSessionApi.create()).resolves.toEqual({
    cookies: { 'CloudFront-Signature': 'c2ln' },
    expiresAt: '2026-11-17T12:00:00.000Z',
  });
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(new URL(String(url)).pathname).toBe('/api/media/playback-session');
  expect(init?.method).toBe('POST');
});

it('phản hồi sai dạng thì báo lỗi để player phát không cookie, không dùng dữ liệu hỏng', async () => {
  configureHttp({ baseUrl: 'http://api', getAccessToken: async () => null });
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
  );
  await expect(playbackSessionApi.create()).rejects.toThrow('Unexpected API response');
});
