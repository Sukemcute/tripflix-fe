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
    <main className="admin-login">
      <section className="admin-login-story">
        <Image src="/brand/tripflix-logo.svg" alt={vi.app.name} width={160} height={48} priority />
        <div>
          <p className="admin-eyebrow">{vi.admin.title}</p>
          <h1>{vi.api.login}</h1>
          <p>{vi.api.staffOnly}</p>
          <Image src="/brand/tripi-welcome.png" alt={vi.mobile.common.mascot} width={230} height={230} />
        </div>
      </section>
      <section className="admin-login-content">
        <div>
          <h2>{vi.api.login}</h2>
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
