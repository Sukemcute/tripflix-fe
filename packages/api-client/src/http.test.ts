import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureHttp, http, HttpError, type HttpResponse } from './http';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('http', () => {
  it('ghép baseUrl, gắn token và x-request-id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { ok: true }));
    configureHttp({ baseUrl: 'http://gw', getAccessToken: () => 'abc' });

    const res = await http<HttpResponse<{ ok: boolean }>>('/api/x');

    expect(res.data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe('http://gw/api/x');
    expect(headers.get('authorization')).toBe('Bearer abc');
    expect(headers.get('x-request-id')).toBeTruthy();
    expect(headers.get('idempotency-key')).toBeNull();
  });

  it('lệnh ghi: refresh khi 401 rồi gửi lại với cùng Idempotency-Key', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(201, { id: 1 }));
    const refresh = vi.fn().mockResolvedValue(true);
    configureHttp({ baseUrl: '', getAccessToken: () => 't', refreshAccessToken: refresh });

    const res = await http<HttpResponse<{ id: number }>>('/api/orders', { method: 'POST' });

    expect(res.status).toBe(201);
    expect(refresh).toHaveBeenCalledOnce();
    const keys = fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get('idempotency-key'));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('lỗi thì ném HttpError có status và body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(409, { code: 'SOLD_OUT' }));
    configureHttp({ baseUrl: '' });

    await expect(http('/api/x')).rejects.toMatchObject(new HttpError(409, { code: 'SOLD_OUT' }));
  });
});
