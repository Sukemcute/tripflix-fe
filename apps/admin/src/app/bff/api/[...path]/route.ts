import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminEventStream } from '../../../../features/shell/server-realtime';

export const runtime = 'nodejs';

const secure = process.env.NODE_ENV === 'production';
const cookieName = secure ? '__Host-tripflix-admin' : 'tripflix-admin';
const sessionSeconds = 8 * 60 * 60;
const adminOrigin = process.env.ADMIN_ORIGIN ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3200';
const coreUrl = process.env.ADMIN_CORE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const noStore = { 'Cache-Control': 'no-store' };
const proofHeader = 'x-tripflix-session-proof';

interface Tokens {
  access: string;
  accessExpiresAt: number;
  refreshCookie: string;
}

interface Session extends Tokens {
  expires: number;
  closing?: boolean;
}

/** Khóa mã hóa AES-256-GCM cho session stateless: không lưu RAM, không giới hạn 1.000 session, đồng bộ đa container (SEC-02). */
const SESSION_KEY = createHash('sha256')
  .update(
    process.env.ADMIN_SESSION_SECRET ??
      process.env.AUTH_JWT_PRIVATE_KEY ??
      'tripflix-admin-session-secret-key-32b-seed',
  )
  .digest();

function sealSession(session: Session): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', SESSION_KEY, iv);
  const payload = Buffer.from(
    JSON.stringify({
      access: session.access,
      accessExpiresAt: session.accessExpiresAt,
      refreshCookie: session.refreshCookie,
      expires: session.expires,
    }),
    'utf8',
  );
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function unsealSession(sealed: string | undefined): Session | undefined {
  if (!sealed) return undefined;
  try {
    const parts = sealed.split('.');
    if (parts.length !== 3) return undefined;
    const [ivStr, tagStr, ctStr] = parts;
    if (!ivStr || !tagStr || !ctStr) return undefined;
    const iv = Buffer.from(ivStr, 'base64url');
    const tag = Buffer.from(tagStr, 'base64url');
    const ciphertext = Buffer.from(ctStr, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', SESSION_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const data = JSON.parse(decrypted.toString('utf8')) as Session;
    if (
      !data ||
      typeof data.access !== 'string' ||
      !Number.isFinite(data.accessExpiresAt) ||
      !Number.isFinite(data.expires) ||
      typeof data.refreshCookie !== 'string'
    ) {
      return undefined;
    }
    return data;
  } catch {
    return undefined;
  }
}

function reply(status: number, body?: object) {
  return new NextResponse(body ? JSON.stringify(body) : null, {
    status,
    headers: { ...noStore, ...(body ? { 'Content-Type': 'application/json' } : {}) },
  });
}

function setSessionCookie(response: NextResponse, id: string, maxAge: number) {
  response.cookies.set(cookieName, id, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge });
}

function forward(response: Response): Response {
  const contentType = response.headers.get('content-type');
  if (response.body && !contentType?.startsWith('application/json')) {
    void response.body.cancel().catch(() => undefined);
    return reply(response.ok ? 502 : response.status);
  }
  const headers = new Headers({ ...noStore, 'X-Content-Type-Options': 'nosniff' });
  for (const name of ['content-type', 'retry-after']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function authError(response: Response) {
  // Giữ mã lỗi để client có thể lấy lại khoá khi mật khẩu mã hoá bị từ chối.
  const data = await response.json().catch(() => null);
  const result = reply(
    response.status,
    data?.code === 'password_envelope_invalid' ? { code: data.code } : undefined,
  );
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) result.headers.set('retry-after', retryAfter);
  return result;
}

async function readTokens(response: Response): Promise<Tokens> {
  const data = await response.json();
  const refreshCookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';', 1)[0] ?? '')
    .find((value) => /^tripflix_refresh(?:_[a-zA-Z0-9_-]+)?=[^;]+$/.test(value));
  if (
    !refreshCookie ||
    typeof data?.accessToken !== 'string' ||
    !data.accessToken ||
    !Number.isFinite(data.expiresIn) ||
    data.expiresIn <= 0
  ) {
    throw new Error('Invalid Core API session response');
  }
  return { access: data.accessToken, accessExpiresAt: Date.now() + data.expiresIn * 1000, refreshCookie };
}

function upstream(
  request: NextRequest,
  path: string,
  options: {
    access?: string;
    web?: boolean;
    cookie?: string;
    body?: string;
    method?: string;
  } = {},
) {
  const headers = new Headers();
  for (const name of ['x-request-id', 'idempotency-key', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (options.web) {
    headers.set('origin', adminOrigin);
    headers.set('x-tripflix-client', 'web');
    const proof = request.headers.get(proofHeader);
    if (proof) headers.set(proofHeader, proof);
  }
  if (options.access) headers.set('authorization', `Bearer ${options.access}`);
  if (options.cookie) headers.set('cookie', options.cookie);
  if (options.body !== undefined) headers.set('content-type', 'application/json');

  return fetch(new URL(path, coreUrl), {
    method: options.method ?? request.method,
    headers,
    body: options.body,
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
}

function allowed(path: string, method: string) {
  if (method === 'GET' && path === '/api/analytics/ai-usage') return true;
  // Chi phí AI theo thời gian, người dùng và trace (SCRUM-179): API tự chặn người không phải superadmin.
  if (method === 'GET' && /^\/api\/analytics\/ai-usage\/(?:timeseries|users)$/.test(path)) return true;
  if (method === 'GET' && /^\/api\/analytics\/ai-traces(?:\/[0-9a-f-]{36})?$/i.test(path)) return true;
  // Hành vi người dùng (SCRUM-177): API tự chặn người không phải superadmin.
  if (method === 'GET' && /^\/api\/analytics\/user-activity(?:\/(?:overview|[0-9a-f-]{36}))?$/i.test(path)) return true;
  if (method === 'GET' && /^\/api\/analytics\/observability(?:\/traces(?:\/[a-f0-9]{32})?)?$/i.test(path)) return true;
  return !path.startsWith('/api/admin/auth/') &&
    (path.startsWith('/api/admin/') || path.startsWith('/api/v1/admin/'));
}

async function login(request: NextRequest, rawCookie: string | undefined) {
  // Chặn cả request gửi trực tiếp đến BFF với trường mật khẩu gốc.
  const data = await request.json().catch(() => null);
  if (!data || typeof data.email !== 'string' || typeof data.encPassword !== 'string' || 'password' in data) {
    return reply(400);
  }
  const body = JSON.stringify({ email: data.email, encPassword: data.encPassword });
  return openSession(request, rawCookie, '/api/admin/auth/login', body);
}

/** Nút "Mở trang quản trị" bên web: đổi mã một lần (POST /api/auth/admin-handoff) lấy phiên, không đăng nhập lại. */
async function exchangeHandoff(request: NextRequest, rawCookie: string | undefined) {
  const data = await request.json().catch(() => null);
  if (!data || typeof data.code !== 'string' || Object.keys(data).length !== 1) return reply(400);
  return openSession(request, rawCookie, '/api/admin/auth/handoff/exchange', JSON.stringify({ code: data.code }));
}

async function openSession(request: NextRequest, rawCookie: string | undefined, path: string, body: string) {
  const response = await upstream(request, path, { web: true, body });
  if (!response.ok) return authError(response);
  const tokens = await readTokens(response);
  const profile = await upstream(request, '/api/admin/me', { method: 'GET', access: tokens.access });
  if (!profile.ok) {
    await upstream(request, '/api/admin/auth/logout', { access: tokens.access }).catch(() => undefined);
    return authError(profile);
  }
  await profile.body?.cancel();

  const previous = unsealSession(rawCookie);
  if (previous) {
    await logout(request, previous).catch(() => undefined);
  }

  const now = Date.now();
  const session: Session = {
    ...tokens,
    expires: now + sessionSeconds * 1000,
  };
  const sealed = sealSession(session);
  const result = reply(204);
  setSessionCookie(result, sealed, sessionSeconds);
  return result;
}

function refreshUpstream(request: NextRequest, session: Session) {
  return upstream(request, '/api/admin/auth/refresh', { web: true, cookie: session.refreshCookie, body: '{}' });
}

async function refresh(request: NextRequest, session: Session) {
  const response = await refreshUpstream(request, session);
  if (!response.ok) {
    const result = await authError(response);
    if (response.status === 401) {
      setSessionCookie(result, '', 0);
    }
    return result;
  }
  const newTokens = await readTokens(response);
  const updatedSession: Session = {
    ...session,
    ...newTokens,
  };
  const result = reply(204);
  setSessionCookie(result, sealSession(updatedSession), sessionSeconds);
  return result;
}

function clearSession() {
  const result = reply(204);
  setSessionCookie(result, '', 0);
  return result;
}

async function logout(request: NextRequest, session: Session) {
  if (session.closing) return reply(409);
  session.closing = true;
  try {
    let response = await upstream(request, '/api/admin/auth/logout', { access: session.access });
    if (response.status === 401) {
      const rotated = await refreshUpstream(request, session);
      if (rotated.status === 401) return clearSession();
      if (!rotated.ok) return authError(rotated);
      const newTokens = await readTokens(rotated);
      response = await upstream(request, '/api/admin/auth/logout', { access: newTokens.access });
    }
    if (!response.ok) return authError(response);
    return clearSession();
  } catch {
    return clearSession();
  } finally {
    session.closing = false;
  }
}

async function handle(request: NextRequest, context: RouteContext<'/bff/api/[...path]'>) {
  const { path: segments } = await context.params;
  // Chỉ nối các segment hợp lệ, tránh đổi đường dẫn upstream qua URL normalization.
  if (segments.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) return reply(404);
  const path = '/api/' + segments.join('/');
  const method = request.method;
  if (method !== 'GET' && request.headers.get('origin') !== adminOrigin) return reply(403);

  const rawCookie = request.cookies.get(cookieName)?.value;
  const session = unsealSession(rawCookie);
  try {
    if (method === 'GET' && path === '/api/auth/password-key') {
      return forward(await upstream(request, '/api/admin/auth/password-key'));
    }
    if (method === 'POST' && path === '/api/auth/login') return await login(request, rawCookie);
    if (method === 'POST' && path === '/api/auth/admin-handoff/exchange') return await exchangeHandoff(request, rawCookie);

    const target = method === 'GET' && path === '/api/auth/me' ? '/api/admin/me' : path;
    const isRefresh = method === 'POST' && path === '/api/auth/refresh';
    const isLogout = method === 'POST' && path === '/api/auth/logout';
    if (!isRefresh && !isLogout && !allowed(target, method)) return reply(404);
    if (!rawCookie || !session || session.expires <= Date.now()) {
      const result = reply(isLogout ? 204 : 401);
      if (rawCookie) setSessionCookie(result, '', 0);
      return result;
    }
    if (isLogout) return await logout(request, session);
    if (session.closing) return reply(401);
    if (isRefresh) {
      return await refresh(request, session);
    }
    if (session.accessExpiresAt <= Date.now()) return reply(401);
    if (method === 'GET' && path === '/api/admin/realtime') {
      const origin = request.headers.get('origin');
      if ((origin && origin !== adminOrigin) || request.headers.get('sec-fetch-site') === 'cross-site')
        return reply(403);
      return createAdminEventStream({
        url: process.env.ADMIN_REALTIME_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
        signal: request.signal,
        getSession: () => unsealSession(request.cookies.get(cookieName)?.value),
      });
    }
    const body = method === 'GET' || !request.body ? undefined : await request.text();
    return forward(await upstream(request, target + request.nextUrl.search, { access: session.access, body }));
  } catch {
    return reply(503);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
