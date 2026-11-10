import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionClient } from './session-client';
import { http, HttpError, type HttpResponse } from './http';
import { getApiErrorKind, getAuthErrorKind } from './response';
import { primePasswordKeyCache } from './password-encryption';

// Các test ở đây kiểm token và phiên; giả như server chưa bật mã hoá mật khẩu để không có request lấy khoá.
// Mã hoá mật khẩu kiểm riêng ở password-encryption.test.ts.
beforeEach(() => primePasswordKeyCache(null));

const user = {
  id: 'member-1',
  email: 'member@example.test',
  displayName: 'Member',
  role: 'member',
  createdAt: '2026-11-05T00:00:00Z',
};
const pair = { accessToken: 'access-1', refreshToken: 'refresh-1', tokenType: 'Bearer', expiresIn: 900 };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
afterEach(() => vi.restoreAllMocks());

describe('session integration', () => {
  it('reports a profile 401 after successful login as a session error', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('/auth/login') ? json(200, pair) : json(401, {}),
    );
    const session = new SessionClient({ baseUrl: '', client: 'web' });

    const [result] = await Promise.allSettled([session.login({ email: user.email, password: 'example-password' })]);
    expect(result?.status).toBe('rejected');
    if (result?.status !== 'rejected') throw new Error('Expected profile loading to fail');
    expect(getAuthErrorKind(result.reason, 'login')).toBeNull();
    expect(getApiErrorKind(result.reason)).toBe('expired');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/login',
      '/api/auth/me',
      '/api/auth/refresh',
    ]);
  });

  it('web login uses the HttpOnly cookie protocol; only the access token enters memory', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, { ...pair, refreshToken: undefined }))
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const session = new SessionClient({ baseUrl: 'http://api/', client: 'web' });
    await session.login({ email: user.email, password: 'example-password' });
    expect(session.getSnapshot().user?.id).toBe(user.id);
    const init = fetchMock.mock.calls[0]![1]!;
    expect(new Headers(init.headers).get('X-Tripflix-Client')).toBe('web');
    expect(init.credentials).toBe('include');
    expect(init).not.toHaveProperty('skipAuthRefresh');
    expect(init).not.toHaveProperty('skipAuthorization');
    await http('/api/example');
    expect(new Headers(fetchMock.mock.calls[2]![1]?.headers).get('authorization')).toBe('Bearer access-1');
  });

  it('binds HTTP to the retained session after a discarded development initializer', async () => {
    const retained = new SessionClient({ baseUrl: '', client: 'web' });
    new SessionClient({ baseUrl: '', client: 'web' });
    retained.connectHttp();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).endsWith('/auth/login')) return json(200, pair);
      return new Headers(init?.headers).get('authorization') === 'Bearer access-1'
        ? json(200, user)
        : json(401, {});
    });
    await retained.login({ email: user.email, password: 'example-password' });
    expect(retained.getSnapshot().user?.id).toBe(user.id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes an expiring token before an optional-auth private post request', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, pair))
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(json(200, { ...pair, accessToken: 'access-2' }))
      .mockResolvedValueOnce(json(200, { post: { id: 'private-post' } }));
    const session = new SessionClient({ baseUrl: '', client: 'native' });
    await session.login({ email: user.email, password: 'example-password' });
    now.mockReturnValue(900_000);
    await http('/api/v1/posts/private-post');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/auth/refresh');
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('authorization')).toBeNull();
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/api/v1/posts/private-post');
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get('authorization')).toBe('Bearer access-2');
  });

  it('anonymous web startup refreshes once, handles 401 without recursion, and becomes ready', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, {}));
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    await Promise.all([session.initialize(), session.initialize()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/refresh');
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({});
    expect(session.getSnapshot()).toEqual({ user: null, isReady: true, error: null });
  });

  it('restores native refresh tokens from secure storage and persists the rotated token', async () => {
    const storage = {
      read: vi.fn().mockResolvedValue('stored-refresh'),
      write: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, pair))
      .mockResolvedValueOnce(json(200, user));
    const session = new SessionClient({ baseUrl: '', client: 'native', storage });
    await session.initialize();
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ refreshToken: 'stored-refresh' });
    expect(storage.write).toHaveBeenCalledWith('refresh-1');
    expect(session.getSnapshot().user?.email).toBe(user.email);
  });

  it('concurrent expired requests rotate only once and retry with the new access token', async () => {
    let refreshCount = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).endsWith('/auth/login')) return json(200, pair);
      if (String(url).endsWith('/auth/me')) return json(200, user);
      if (String(url).endsWith('/auth/refresh')) {
        refreshCount++;
        await Promise.resolve();
        return json(200, { ...pair, accessToken: 'access-2' });
      }
      return new Headers(init?.headers).get('authorization') === 'Bearer access-2'
        ? json(200, { ok: true })
        : json(401, {});
    });
    const session = new SessionClient({ baseUrl: '', client: 'native' });
    await session.login({ email: user.email, password: 'example-password' });
    const responses = await Promise.all([
      http<HttpResponse<{ ok: boolean }>>('/api/a'),
      http<HttpResponse<{ ok: boolean }>>('/api/b'),
    ]);
    expect(refreshCount).toBe(1);
    expect(responses.every((response) => response.data.ok)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it('failed login never marks the user signed in and never invokes refresh', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(401, {}));
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    await expect(session.login({ email: user.email, password: 'wrong' })).rejects.toBeInstanceOf(HttpError);
    expect(session.getSnapshot().user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('network failure preserves the native refresh token and allows retry', async () => {
    const storage = { read: vi.fn().mockResolvedValue('stored-refresh'), write: vi.fn(), clear: vi.fn() };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('offline'));
    const session = new SessionClient({ baseUrl: '', client: 'native', storage });
    await session.initialize();
    expect(session.getSnapshot().error).toBeInstanceOf(TypeError);
    expect(storage.clear).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(json(200, pair)).mockResolvedValueOnce(json(200, user));
    await session.initialize();
    expect(session.getSnapshot().user?.id).toBe(user.id);
  });

  it('logout revokes the server session before clearing secure storage and local state', async () => {
    const storage = { read: vi.fn(), write: vi.fn(), clear: vi.fn() };
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, pair))
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const session = new SessionClient({ baseUrl: '', client: 'native', storage });
    await session.login({ email: user.email, password: 'example-password' });
    await session.logout();
    expect(storage.clear).toHaveBeenCalledOnce();
    expect(session.getSnapshot().user).toBeNull();
  });

  it('an in-flight user response cannot sign the user back in after logout', async () => {
    let finishUser: (response: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, pair))
      .mockResolvedValueOnce(json(200, user))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishUser = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const session = new SessionClient({ baseUrl: '', client: 'native' });
    await session.login({ email: user.email, password: 'example-password' });
    const reload = session.reloadUser();
    await Promise.resolve();
    await session.logout();
    finishUser(json(200, user));
    await reload;
    expect(session.getSnapshot().user).toBeNull();
  });
});

describe('Google sign-in', () => {
  it('web: posts the ID token with the cookie protocol and loads the user like a password login', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, { ...pair, refreshToken: undefined }))
      .mockResolvedValueOnce(json(200, user));
    const session = new SessionClient({ baseUrl: 'http://api', client: 'web' });
    await session.loginWithGoogle({ idToken: 'google-id-token', deviceName: 'Chrome · Windows' });
    expect(session.getSnapshot().user?.id).toBe(user.id);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('http://api/api/auth/google');
    expect(JSON.parse(String(init!.body))).toEqual({
      idToken: 'google-id-token',
      deviceName: 'Chrome · Windows',
    });
    expect(new Headers(init!.headers).get('X-Tripflix-Client')).toBe('web');
    expect(init!.credentials).toBe('include');
  });

  it('native: stores the rotated refresh token in secure storage', async () => {
    const write = vi.fn(async () => undefined);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(200, pair))
      .mockResolvedValueOnce(json(200, user));
    const session = new SessionClient({
      baseUrl: '',
      client: 'native',
      storage: { read: async () => null, write, clear: async () => undefined },
    });
    await session.loginWithGoogle({ idToken: 'google-id-token' });
    expect(write).toHaveBeenCalledWith(pair.refreshToken);
  });

  it('a rejected Google token never marks the user signed in and never refreshes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(401, { message: 'no' }));
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    await expect(session.loginWithGoogle({ idToken: 'bad' })).rejects.toMatchObject({ status: 401 });
    expect(session.getSnapshot().user).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('sendRegistrationCode', () => {
  it('returns the resend wait; an older backend without it does not block resending', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(202, { registrationId: 'reg-1', resendAfterSeconds: 60 }))
      .mockResolvedValueOnce(json(202, { registrationId: 'reg-2' }))
      .mockResolvedValueOnce(json(202, { registrationId: 'reg-3', resendAfterSeconds: 60 }));
    const session = new SessionClient({ baseUrl: 'http://api/', client: 'web' });
    const input = { email: user.email, password: 'example-password' };
    expect(await session.sendRegistrationCode(input)).toEqual({
      registrationId: 'reg-1',
      resendAfterSeconds: 60,
    });
    expect(await session.sendRegistrationCode(input)).toEqual({
      registrationId: 'reg-2',
      resendAfterSeconds: 0,
    });
    expect(await session.requestRegistrationCode(input)).toBe('reg-3');
  });
});
