import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDemoAdminReturnPath } from '@tripflix/app-core';

export interface AdminDemoSession {
  email: string;
  expiresAt: number;
}
const COOKIE_NAME = 'tripflix_admin_preview';
const SESSION_SECONDS = 8 * 60 * 60;
const sessionGlobal = globalThis as typeof globalThis & {
  tripflixAdminPreviewSessions?: Map<string, AdminDemoSession>;
};
const sessions = (sessionGlobal.tripflixAdminPreviewSessions ??= new Map<string, AdminDemoSession>());

export function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ADMIN_ENABLE_DEMO_LOGIN === 'true';
}

/** Local preview only. Real authentication must replace this adapter before deployment. */
export async function createAdminDemoSession(email: string): Promise<void> {
  const now = Date.now();
  for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { email, expiresAt: now + SESSION_SECONDS * 1000 });
  const jar = await cookies();
  const previous = jar.get(COOKIE_NAME)?.value;
  if (previous) sessions.delete(previous);
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function getAdminDemoSession(): Promise<AdminDemoSession | null> {
  // Read cookies on every request so Next never prerenders a protected tab's redirect.
  const jar = await cookies();
  if (!isDemoLoginEnabled()) return null;
  const token = jar.get(COOKIE_NAME)?.value;
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}

export async function requireAdminDemoSession(returnTo: string): Promise<AdminDemoSession> {
  const session = await getAdminDemoSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(getDemoAdminReturnPath(returnTo))}`);
  return session;
}

export async function clearAdminDemoSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) sessions.delete(token);
  jar.delete(COOKIE_NAME);
}
