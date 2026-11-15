import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const secure = process.env.NODE_ENV === 'production';
const cookieName = secure ? '__Host-tripflix-admin' : 'tripflix-admin';
const sessionSeconds = 8 * 60 * 60;
const maxSessions = 1_000;
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
  refresh?: Promise<Response>;
  closing?: boolean;
}

const server = globalThis as typeof globalThis & { tripflixAdminSessions?: Map<string, Session> };
const sessions = (server.tripflixAdminSessions ??= new Map());

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
  const result = reply(response.status, data?.code === 'password_envelope_invalid' ? { code: data.code } : undefined);
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) result.headers.set('retry-after', retryAfter);
  return result;
}

async function readTokens(response: Response): Promise<Tokens> {
  const data = await response.json();
  const refreshCookie = response.headers.getSetCookie()
    .map((value) => value.split(';', 1)[0] ?? '')
    .find((value) => /^tripflix_refresh(?:_[a-zA-Z0-9_-]+)?=[^;]+$/.test(value));
  if (
    !refreshCookie || typeof data?.accessToken !== 'string' || !data.accessToken ||
    !Number.isFinite(data.expiresIn) || data.expiresIn <= 0
  ) {
    throw new Error('Invalid Core API session response');
  }
  return { access: data.accessToken, accessExpiresAt: Date.now() + data.expiresIn * 1000, refreshCookie };
}

function upstream(request: NextRequest, path: string, options: {
  access?: string;
  web?: boolean;
  cookie?: string;
  body?: string;
  method?: string;
} = {}) {
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
  if (path.startsWith('/api/admin/') || path.startsWith('/api/v1/admin/')) return true;
  if (method === 'GET') return path === '/api/auth/me' || path === '/api/recommendations/home';
  return method === 'POST' && (path === '/api/search' || path === '/api/search/posts');
}

async function login(request: NextRequest, id: string | undefined) {
  // Chặn cả request gửi trực tiếp đến BFF với trường mật khẩu gốc.
  const data = await request.json().catch(() => null);
  if (!data || typeof data.email !== 'string' || typeof data.encPassword !== 'string' || 'password' in data) {
    return reply(400);
  }
  const body = JSON.stringify({ email: data.email, encPassword: data.encPassword });
  const response = await upstream(request, '/api/auth/login', { web: true, body });
  if (!response.ok) return authError(response);
  const tokens = await readTokens(response);
  const profile = await upstream(request, '/api/admin/me', { method: 'GET', access: tokens.access });
  if (!profile.ok) {
    await upstream(request, '/api/auth/logout', { access: tokens.access }).catch(() => undefined);
    return authError(profile);
  }
  await profile.body?.cancel();

  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expires <= now) sessions.delete(key);
  }
  const previous = id ? sessions.get(id) : undefined;
  if (previous && id) {
    const revoked = await logout(request, id, previous);
    if (!revoked.ok) {
      await upstream(request, '/api/auth/logout', { access: tokens.access }).catch(() => undefined);
      return revoked;
    }
  }
  if (sessions.size >= maxSessions) {
    await upstream(request, '/api/auth/logout', { access: tokens.access }).catch(() => undefined);
    return reply(503);
  }
  const nextId = randomBytes(32).toString('base64url');
  sessions.set(nextId, { ...tokens, expires: now + sessionSeconds * 1000 });
  const result = reply(204);
  setSessionCookie(result, nextId, sessionSeconds);
  return result;
}

function refreshUpstream(request: NextRequest, session: Session) {
  return upstream(request, '/api/auth/refresh', { web: true, cookie: session.refreshCookie, body: '{}' });
}

async function refresh(request: NextRequest, id: string, session: Session) {
  const response = await refreshUpstream(request, session);
  if (!response.ok) {
    const result = await authError(response);
    if (response.status === 401) {
      sessions.delete(id);
      setSessionCookie(result, '', 0);
    }
    return result;
  }
  Object.assign(session, await readTokens(response));
  return reply(204);
}

function clearSession(id: string) {
  sessions.delete(id);
  const result = reply(204);
  setSessionCookie(result, '', 0);
  return result;
}

async function logout(request: NextRequest, id: string, session: Session) {
  if (session.closing) return reply(409);
  session.closing = true;
  try {
    await session.refresh;
    if (!sessions.has(id)) return clearSession(id);
    let response = await upstream(request, '/api/auth/logout', { access: session.access });
    if (response.status === 401) {
      const rotated = await refreshUpstream(request, session);
      if (rotated.status === 401) return clearSession(id);
      if (!rotated.ok) return authError(rotated);
      Object.assign(session, await readTokens(rotated));
      response = await upstream(request, '/api/auth/logout', { access: session.access });
    }
    if (!response.ok) return authError(response);
    return clearSession(id);
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

  const id = request.cookies.get(cookieName)?.value;
  const session = id ? sessions.get(id) : undefined;
  try {
    if (method === 'GET' && path === '/api/auth/password-key') {
      return forward(await upstream(request, path));
    }
    if (method === 'POST' && path === '/api/auth/login') return await login(request, id);

    const isRefresh = method === 'POST' && path === '/api/auth/refresh';
    const isLogout = method === 'POST' && path === '/api/auth/logout';
    if (!isRefresh && !isLogout && !allowed(path, method)) return reply(404);
    if (!id || !session || session.expires <= Date.now()) {
      if (id) sessions.delete(id);
      const result = reply(isLogout ? 204 : 401);
      if (id) setSessionCookie(result, '', 0);
      return result;
    }
    if (isLogout) return await logout(request, id, session);
    if (session.closing) return reply(401);
    if (isRefresh) {
      session.refresh ??= refresh(request, id, session).finally(() => { session.refresh = undefined; });
      // Mỗi caller cần một response riêng khi nhiều tab cùng yêu cầu refresh.
      return (await session.refresh).clone();
    }
    if (session.accessExpiresAt <= Date.now()) return reply(401);
    const body = method === 'GET' || !request.body ? undefined : await request.text();
    return forward(await upstream(request, path + request.nextUrl.search, { access: session.access, body }));
  } catch {
    return reply(503);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
