import { createDecipheriv, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, resetPassword } from './password-actions';
import {
  encryptPassword,
  PASSWORD_ENVELOPE_INVALID_CODE,
  primePasswordKeyCache,
  resetPasswordKeyCache,
  type PasswordKey,
  type PasswordPurpose,
} from './password-encryption';
import { SessionClient } from './session-client';

vi.mock('./browser-session-proof', () => ({
  BROWSER_PROOF_HEADER: 'X-Tripflix-Session-Proof',
  signBrowserProof: async () => 'signed-proof',
}));

/** Server giả: giải mã bằng node:crypto đúng như core-api (x25519-password-keyring.ts), độc lập với @noble. */
function createServerKey(keyId = 'k1') {
  const { privateKey } = generateKeyPairSync('x25519');
  const publicRaw = Buffer.from(String(createPublicKey(privateKey).export({ format: 'jwk' }).x), 'base64url');
  const key: PasswordKey = { keyId, publicKey: publicRaw.toString('base64url') };
  const decrypt = (envelope: string, purpose: PasswordPurpose, subject: string) => {
    const [prefix, version, kid, ts, data] = envelope.split(':');
    expect([prefix, version, kid]).toEqual(['#TFPWD', '1', keyId]);
    const blob = Buffer.from(data!, 'base64url');
    const ephemeralRaw = blob.subarray(0, 32);
    const iv = blob.subarray(32, 44);
    const sealed = blob.subarray(44);
    const ephemeral = createPublicKey({
      key: { kty: 'OKP', crv: 'X25519', x: ephemeralRaw.toString('base64url') },
      format: 'jwk',
    });
    const shared = diffieHellman({ privateKey, publicKey: ephemeral });
    const aesKey = Buffer.from(
      hkdfSync('sha256', shared, Buffer.concat([ephemeralRaw, publicRaw]), 'tripflix-pwd-v1', 32),
    );
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAAD(Buffer.from(`tripflix-pwd|1|${purpose}|${keyId}|${ts}|${subject}`));
    decipher.setAuthTag(sealed.subarray(sealed.length - 16));
    const plain = Buffer.concat([
      decipher.update(sealed.subarray(0, sealed.length - 16)),
      decipher.final(),
    ]).toString();
    return { ts: Number(ts), ...(JSON.parse(plain) as { p: string; n: string; t: number }) };
  };
  return { key, decrypt };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const bodyOf = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;

beforeEach(() => resetPasswordKeyCache());
afterEach(() => vi.restoreAllMocks());

describe('encryptPassword', () => {
  const server = createServerKey();
  const now = 1_794_300_000;

  it('server giải mã ra đúng mật khẩu, kể cả tiếng Việt và emoji; chuỗi không chứa mật khẩu gốc', () => {
    for (const password of ['mat-khau-an-toan', 'Mật khẩu có dấu 🙂', ' hai đầu có khoảng trắng ']) {
      const envelope = encryptPassword(server.key, password, {
        purpose: 'login',
        email: 'lan@example.com',
        nowSeconds: now,
      });
      expect(envelope).toMatch(/^#TFPWD:1:k1:1794300000:[A-Za-z0-9_-]+$/);
      expect(envelope).not.toContain(password.trim());
      const opened = server.decrypt(envelope, 'login', 'lan@example.com');
      expect(opened).toMatchObject({ p: password, t: now, ts: now });
      expect(opened.n).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
  });

  it('email trong AAD được chuẩn hoá như core-api (trim, chữ thường)', () => {
    const envelope = encryptPassword(server.key, 'pw', {
      purpose: 'register',
      email: '  Lan@Example.COM ',
      nowSeconds: now,
    });
    expect(server.decrypt(envelope, 'register', 'lan@example.com').p).toBe('pw');
  });

  it('đổi, đặt lại mật khẩu không gắn email (server dùng chuỗi rỗng)', () => {
    const envelope = encryptPassword(server.key, 'pw', {
      purpose: 'reset',
      email: 'lan@example.com',
      nowSeconds: now,
    });
    expect(server.decrypt(envelope, 'reset', '').p).toBe('pw');
  });

  it('giải mã với mục đích khác hoặc email khác thì hỏng (AAD)', () => {
    const envelope = encryptPassword(server.key, 'pw', {
      purpose: 'login',
      email: 'lan@example.com',
      nowSeconds: now,
    });
    expect(() => server.decrypt(envelope, 'register', 'lan@example.com')).toThrow();
    expect(() => server.decrypt(envelope, 'login', 'minh@example.com')).toThrow();
  });

  it('mỗi lần mã hoá ra chuỗi khác (khoá tạm, iv, nonce ngẫu nhiên)', () => {
    const a = encryptPassword(server.key, 'pw', { purpose: 'login', nowSeconds: now });
    const b = encryptPassword(server.key, 'pw', { purpose: 'login', nowSeconds: now });
    expect(a).not.toBe(b);
    expect(server.decrypt(a, 'login', '').n).not.toBe(server.decrypt(b, 'login', '').n);
  });

  it('khoá công khai sai độ dài: báo lỗi, không gửi gì', () => {
    expect(() =>
      encryptPassword({ keyId: 'k1', publicKey: 'ngan' }, 'pw', { purpose: 'login', nowSeconds: now }),
    ).toThrow();
  });
});

describe('SessionClient + mã hoá mật khẩu', () => {
  it('đăng nhập: lấy khoá, gửi encPassword, không có trường password; ts theo giờ server', async () => {
    const server = createServerKey();
    const serverTime = Math.floor(Date.now() / 1000) + 3600; // đồng hồ máy chậm hơn server 1 giờ
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const path = String(url);
      if (path.endsWith('/auth/password-key'))
        return json(200, { ...server.key, serverTime, version: 1, algorithm: 'x' });
      if (path.endsWith('/auth/login'))
        return json(200, { accessToken: 'a', tokenType: 'Bearer', expiresIn: 900 });
      return json(200, { id: 'u', email: 'lan@example.com', displayName: 'Lan', role: 'member' });
    });
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    await session.login({ email: 'Lan@Example.com', password: 'mat-khau-an-toan', deviceName: 'Chrome' });

    const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/login'))!;
    const body = bodyOf(loginCall[1]);
    expect(body).not.toHaveProperty('password');
    expect(body).toMatchObject({ email: 'Lan@Example.com', deviceName: 'Chrome' });
    expect(JSON.stringify(body)).not.toContain('mat-khau-an-toan');
    const opened = server.decrypt(String(body.encPassword), 'login', 'lan@example.com');
    expect(opened.p).toBe('mat-khau-an-toan');
    expect(Math.abs(opened.ts - serverTime)).toBeLessThanOrEqual(2);
  });

  it('server từ chối chuỗi (khoá vừa đổi): lấy khoá mới, gửi lại đúng một lần', async () => {
    const oldKey = createServerKey('k1');
    const newKey = createServerKey('k2');
    let keyCalls = 0;
    let loginCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith('/auth/password-key'))
        return json(200, { ...(keyCalls++ === 0 ? oldKey.key : newKey.key), serverTime: Date.now() / 1000 });
      if (path.endsWith('/auth/login')) {
        loginCalls++;
        const enc = String(bodyOf(init).encPassword);
        return enc.includes(':k2:')
          ? json(200, { accessToken: 'a', tokenType: 'Bearer', expiresIn: 900 })
          : json(400, {
              code: PASSWORD_ENVELOPE_INVALID_CODE,
              errors: [{ field: 'encPassword', message: 'x' }],
            });
      }
      return json(200, { id: 'u', email: 'a@b.c', displayName: 'A', role: 'member' });
    });
    await new SessionClient({ baseUrl: '', client: 'web' }).login({
      email: 'a@b.c',
      password: 'pw-12345678',
    });
    expect(keyCalls).toBe(2);
    expect(loginCalls).toBe(2);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('lỗi khác (sai mật khẩu 401): không thử lại, không lấy lại khoá', async () => {
    const server = createServerKey();
    let loginCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/password-key'))
        return json(200, { ...server.key, serverTime: Date.now() / 1000 });
      loginCalls++;
      return json(401, { message: 'Email hoặc mật khẩu không đúng' });
    });
    await expect(
      new SessionClient({ baseUrl: '', client: 'web' }).login({ email: 'a@b.c', password: 'sai' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(loginCalls).toBe(1);
  });

  it.each([404, 503])('không gửi login nếu API khoá trả %i và có thể thử lại', async (status) => {
    const server = createServerKey();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(status, {}))
      .mockResolvedValueOnce(json(200, { ...server.key, serverTime: Date.now() / 1000 }))
      .mockResolvedValueOnce(json(401, {}));
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    const credentials = { email: 'a@b.c', password: 'pw' };

    await expect(session.login(credentials)).rejects.toMatchObject({ status });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/password-key']);

    await expect(session.login(credentials)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/password-key',
      '/api/auth/password-key',
      '/api/auth/login',
    ]);
    expect(bodyOf(fetchMock.mock.calls[2]![1])).toMatchObject({ encPassword: expect.any(String) });
    expect(bodyOf(fetchMock.mock.calls[2]![1])).not.toHaveProperty('password');
  });

  it('xin mã đăng ký chỉ gửi email; đăng ký gửi encPassword rồi đăng nhập bằng encPassword', async () => {
    const server = createServerKey();
    primePasswordKeyCache(server.key);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const path = String(url);
      if (path.endsWith('/registration-code'))
        return json(202, { registrationId: 'r', resendAfterSeconds: 60 });
      if (path.endsWith('/auth/register')) return json(201, { id: 'u' });
      if (path.endsWith('/auth/login'))
        return json(200, { accessToken: 'a', tokenType: 'Bearer', expiresIn: 900 });
      return json(200, { id: 'u', email: 'lan@example.com', displayName: 'Lan', role: 'member' });
    });
    const session = new SessionClient({ baseUrl: '', client: 'web' });
    await session.sendRegistrationCode({ email: 'lan@example.com' });
    await session.register({
      email: 'lan@example.com',
      password: 'mat-khau-an-toan',
      displayName: 'Lan',
      registrationId: 'r',
      code: '12345678',
      dateOfBirth: '2000-05-20',
      gender: 'female',
      nationality: 'VN',
      acceptTerms: true,
    });
    const byPath = (suffix: string) =>
      bodyOf(fetchMock.mock.calls.find(([url]) => String(url).endsWith(suffix))![1]);
    expect(byPath('/registration-code')).toEqual({ email: 'lan@example.com' });
    const reg = byPath('/auth/register');
    expect(reg).not.toHaveProperty('password');
    expect(server.decrypt(String(reg.encPassword), 'register', 'lan@example.com').p).toBe('mat-khau-an-toan');
    const login = byPath('/auth/login');
    expect(server.decrypt(String(login.encPassword), 'login', 'lan@example.com').p).toBe('mat-khau-an-toan');
  });
});

describe('đổi, đặt lại mật khẩu, tạo nhân sự', () => {
  const server = createServerKey();
  beforeEach(() => primePasswordKeyCache(server.key));

  it('đổi mật khẩu gửi encCurrentPassword và encNewPassword', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await changePassword({ currentPassword: 'mat-khau-cu', newPassword: 'mat-khau-moi' });
    const body = bodyOf(fetchMock.mock.calls[0]![1]);
    expect(Object.keys(body).sort()).toEqual(['encCurrentPassword', 'encNewPassword']);
    expect(server.decrypt(String(body.encCurrentPassword), 'change_current', '').p).toBe('mat-khau-cu');
    expect(server.decrypt(String(body.encNewPassword), 'change_new', '').p).toBe('mat-khau-moi');
  });

  it('đặt lại mật khẩu gửi token và encNewPassword', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await resetPassword({ token: 'tok', newPassword: 'mat-khau-moi' });
    const body = bodyOf(fetchMock.mock.calls[0]![1]);
    expect(body.token).toBe('tok');
    expect(body).not.toHaveProperty('newPassword');
    expect(server.decrypt(String(body.encNewPassword), 'reset', '').p).toBe('mat-khau-moi');
  });
});
