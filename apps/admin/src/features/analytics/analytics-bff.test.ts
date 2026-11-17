import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/bff/api/[...path]/route';

const origin = process.env.ADMIN_ORIGIN ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3200';
const context = (path: string): Parameters<typeof GET>[1] => ({
  params: Promise.resolve({ path: path.split('/') }),
});
const json = (body: object) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

async function login() {
  const fetch = vi.fn(async (input: URL, _init?: RequestInit) => {
    if (input.pathname === '/api/auth/admin-handoff/exchange')
      return new Response(JSON.stringify({ accessToken: 'fixture-access', expiresIn: 3600 }), {
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'tripflix_refresh=fixture-refresh; HttpOnly',
        },
      });
    return json({ rows: [], total: { calls: 0, costUsd: 0 } });
  });
  vi.stubGlobal('fetch', fetch);
  const response = await POST(
    new NextRequest(`${origin}/bff/api/auth/admin-handoff/exchange`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'fixture-handoff-code' }),
    }),
    context('auth/admin-handoff/exchange'),
  );
  expect(response.status).toBe(204);
  const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  fetch.mockClear();
  return { fetch, cookie };
}

it('forwards AI usage with query and the server session, alongside observability', async () => {
  const { fetch, cookie } = await login();
  for (const path of ['analytics/ai-usage', 'analytics/observability']) {
    const response = await GET(
      new NextRequest(`${origin}/bff/api/${path}?groupBy=model`, { headers: { cookie } }),
      context(path),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const call = fetch.mock.calls.at(-1)!;
    expect(call[0].pathname).toBe(`/api/${path}`);
    expect(call[0].searchParams.get('groupBy')).toBe('model');
    expect(new Headers(call[1]?.headers).get('authorization')).toBe('Bearer fixture-access');
  }
});

it('requires a session for AI usage and does not forward unauthenticated requests', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const response = await GET(
    new NextRequest(`${origin}/bff/api/analytics/ai-usage`),
    context('analytics/ai-usage'),
  );
  expect(response.status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});

it('keeps AI usage read-only and rejects unrelated analytics paths', async () => {
  const { fetch, cookie } = await login();
  const write = await POST(
    new NextRequest(`${origin}/bff/api/analytics/ai-usage`, { method: 'POST', headers: { origin, cookie } }),
    context('analytics/ai-usage'),
  );
  expect(write.status).toBe(404);
  const unknown = await GET(
    new NextRequest(`${origin}/bff/api/analytics/private`, { headers: { cookie } }),
    context('analytics/private'),
  );
  expect(unknown.status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
