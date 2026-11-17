'use client';
import { useApiSession, HttpError } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';
import { Icon } from '../ui/icon';
import { Button, controlClass, fieldLabelClass } from '../ui/primitives';

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
    <main className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="hidden flex-col justify-between overflow-hidden bg-navy p-12 text-background lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-background">
            <Image src="/icon.svg" alt={vi.app.name} width={26} height={27} priority />
          </span>
          <span className="leading-tight">
            <strong className="block text-lg">Tripflix</strong>
            <span className="text-sm text-background/60">{vi.adminConsole.brandSub}</span>
          </span>
        </div>
        <div className="max-w-md">
          <Image src="/brand/tripi-welcome.png" alt={vi.mobile.common.mascot} width={140} height={140} priority className="mb-6" />
          <h1 className="text-4xl leading-tight font-bold tracking-tight">{vi.admin.title}</h1>
          <p className="mt-4 text-base text-background/70">{vi.api.staffOnly}</p>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-background/80">
            {([
              ['shield', vi.adminConsole.moderation.subtitle],
              ['pulse', vi.adminConsole.live.liveHint],
              ['bell', vi.adminConsole.alerts.subtitle],
            ] as const).map(([icon, label]) => (
              <li key={icon} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/10 text-teal">
                  <Icon name={icon} size={16} />
                </span>
                <span className="pt-1.5">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <span aria-hidden="true" />
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
          <Image src="/icon.svg" alt={vi.app.name} width={36} height={38} className="mb-6 lg:hidden" />
          <h2 className="text-2xl font-bold tracking-tight">{vi.api.login}</h2>
          <p className="mt-1 mb-6 text-sm text-text-muted">{vi.admin.title}</p>
          <AdminApiError error={error} retry={() => void session.initialize()} />
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <label className={fieldLabelClass} htmlFor="admin-email">
              {vi.api.email}
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              className={`${controlClass} -mt-3 h-11`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label className={fieldLabelClass} htmlFor="admin-password">
              {vi.api.password}
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              maxLength={128}
              className={`${controlClass} -mt-3 h-11`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mutation.error instanceof HttpError && mutation.error.status === 401 ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {vi.api.wrongCredentials}
              </p>
            ) : (
              <AdminApiError error={mutation.error} />
            )}
            <Button type="submit" variant="primary" className="mt-2 h-11" disabled={!isReady || mutation.isPending}>
              {mutation.isPending ? vi.api.loggingIn : vi.api.login}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
