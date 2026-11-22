'use client';
import { useApiSession, HttpError } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

export function AdminLogin({ returnTo }: { returnTo: string }) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => session.login({ email: email.trim(), password }),
    onSuccess: () => {
      setPassword('');
      router.replace(returnTo);
    },
  });
  return (
    <main className="grid min-h-dvh bg-background text-ink lg:grid-cols-2">
      <section className="flex flex-col items-start gap-12 border-b border-border bg-surface p-8 lg:border-r lg:border-b-0 lg:p-16">
        <Image src="/brand/tripflix-logo.svg" alt={vi.app.name} width={160} height={48} priority />
        <div className="my-auto max-w-md py-6">
          <p className="mb-6 text-xs font-bold tracking-wider text-teal-ink">
            {vi.adminOperations.workspace}
          </p>
          <h1 className="text-3xl leading-tight font-bold tracking-tight lg:text-5xl">
            {vi.adminOperations.loginHeading}
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-loose text-text-muted">
            {vi.adminOperations.loginHint}
          </p>
          <ul className="mt-10 divide-y divide-border border-y border-border text-xs text-text-muted">
            {[
              vi.adminOperations.pending,
              vi.adminOperations.infrastructure,
              vi.adminOperations.staffTitle,
            ].map((label, index) => (
              <li key={label} className="flex gap-4 py-4">
                <span className="font-mono text-text-subtle">0{index + 1}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] text-text-muted">{vi.adminOperations.loginRestricted}</p>
      </section>
      <section className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">{vi.adminOperations.loginWelcome}</h2>
          <p className="mt-3 mb-8 text-xs leading-relaxed text-text-muted">
            {vi.adminOperations.loginAccount}
          </p>
          <AdminApiError
            error={error}
            retry={() => {
              void session.initialize();
            }}
          />
          <form
            className="admin-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <label htmlFor="admin-email">{vi.api.email}</label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="admin-password">{vi.api.password}</label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mutation.error instanceof HttpError && mutation.error.status === 401 ? (
              <p role="alert" className="admin-error">
                {vi.api.wrongCredentials}
              </p>
            ) : (
              <AdminApiError error={mutation.error} />
            )}
            <button className="admin-primary" disabled={!isReady || mutation.isPending}>
              {mutation.isPending ? vi.api.loggingIn : vi.api.login}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
