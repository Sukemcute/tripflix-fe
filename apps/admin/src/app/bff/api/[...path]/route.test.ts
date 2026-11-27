import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const ADMIN_ORIGIN = 'http://localhost:3200';
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function post(path: string[], body: unknown) {
  const request = new NextRequest(`${ADMIN_ORIGIN}/bff/api/${path.join('/')}`, {
    method: 'POST',
    headers: { origin: ADMIN_ORIGIN, 'content-type': 'application/json', 'x-tripflix-session-proof': 'signed-proof' },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ path }) } as never);
}

afterEach(() => vi.restoreAllMocks());

it('đổi mã một lần lấy phiên admin: gửi Origin admin, chế độ web, chữ ký; kiểm quyền rồi đặt cookie', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      json(200, { accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 }, {
        'set-cookie': 'tripflix_refresh_abc=w1.secret; Path=/api/auth; HttpOnly',
      }),
    )
    .mockResolvedValueOnce(json(200, { id: 'staff-1' }));

  const response = await post(['auth', 'admin-handoff', 'exchange'], { code: 'handoff-code' });

  expect(response.status).toBe(204);
  expect(response.headers.get('set-cookie')).toMatch(/tripflix-admin=[^;]+;.*HttpOnly/i);
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(String(url)).toMatch(/\/api\/admin\/auth\/handoff\/exchange$/);
  expect(JSON.parse(String(init!.body))).toEqual({ code: 'handoff-code' });
  const headers = new Headers(init!.headers);
  expect(headers.get('origin')).toBe(ADMIN_ORIGIN);
  expect(headers.get('x-tripflix-client')).toBe('web');
  expect(headers.get('x-tripflix-session-proof')).toBe('signed-proof');
  expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/api\/admin\/me$/);
});

it('không phải nhân viên: thu hồi phiên vừa tạo, không đặt cookie', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      json(200, { accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 }, {
        'set-cookie': 'tripflix_refresh_abc=w1.secret; Path=/api/auth; HttpOnly',
      }),
    )
    .mockResolvedValueOnce(json(403, { message: 'Forbidden' }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));

  const response = await post(['auth', 'admin-handoff', 'exchange'], { code: 'handoff-code' });

  expect(response.status).toBe(403);
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(String(fetchMock.mock.calls[2]![0])).toMatch(/\/api\/admin\/auth\/logout$/);
});

it('body đổi mã sai dạng thì 400, không gọi core', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  expect((await post(['auth', 'admin-handoff', 'exchange'], { code: 'x', extra: 1 })).status).toBe(400);
  expect((await post(['auth', 'admin-handoff', 'exchange'], { code: 1 })).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('phiên làm việc stateless (SEC-02): không bị trần cứng 1000 session gây DoS 503', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: unknown) => {
    const url = String(input);
    if (url.endsWith('/api/admin/auth/login')) {
      return json(200, { accessToken: 'access-ok', tokenType: 'Bearer', expiresIn: 900 }, {
        'set-cookie': 'tripflix_refresh=secret; Path=/api/auth; HttpOnly',
      });
    }
    if (url.endsWith('/api/admin/me')) {
      return json(200, { id: 'staff-ok' });
    }
    return json(200, {});
  });

  // Gọi liên tiếp nhiều phiên, đảm bảo không gặp lỗi 503 (bỏ trần maxSessions = 1000)
  for (let i = 0; i < 5; i++) {
    const response = await post(['auth', 'login'], {
      email: `staff-${i}@example.test`,
      encPassword: 'encrypted-pass',
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toMatch(/tripflix-admin=[^;]+;.*HttpOnly/i);
  }
});
