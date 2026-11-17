'use server';

import { getDemoAdminReturnPath } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import { redirect } from 'next/navigation';
import { clearAdminDemoSession, createAdminDemoSession, isDemoLoginEnabled } from './session';

export interface LoginState {
  error?: string;
}
export async function loginAdminPreview(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!isDemoLoginEnabled()) return { error: vi.demo.admin.unavailable };
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  // DEMO is a public preview code displayed on the form, never a real account password.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || form.get('code') !== 'DEMO')
    return { error: vi.demo.admin.invalid };
  await createAdminDemoSession(email);
  redirect(getDemoAdminReturnPath(form.get('returnTo')));
}

export async function logoutAdminPreview(): Promise<void> {
  await clearAdminDemoSession();
  redirect('/login');
}
