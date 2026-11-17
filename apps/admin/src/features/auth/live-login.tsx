'use client';
import { useApiSession, HttpError } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminApiError } from '../shell/api-state';

// Icon nét mảnh cùng bộ với trang đăng nhập web (apps/web auth-fields.tsx).
const ICON_PROPS = { 'aria-hidden': true, viewBox: '0 0 24 24', width: 20, height: 20 } as const;
const MAIL_ICON = (
  <svg {...ICON_PROPS} className="admin-login-icon">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
const LOCK_ICON = (
  <svg {...ICON_PROPS} className="admin-login-icon">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
const EYE_OPEN = (
  <svg {...ICON_PROPS}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_CLOSED = (
  <svg {...ICON_PROPS}>
    <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
);

export function AdminLogin({ returnTo }: { returnTo: string }) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: () => session.login({ email: email.trim(), password }),
    onSuccess: () => {
      setPassword('');
      router.replace(returnTo);
    },
  });
  return (
    <main className="admin-login">
      {/* Ảnh phong cảnh mờ phủ cả trang như trang đăng nhập web; thẻ form nổi bên trên. */}
      <span className="admin-login-bg" aria-hidden="true">
        <Image src="/brand/home-shore.jpg" alt="" fill sizes="100vw" priority />
      </span>
      <section className="admin-login-story">
        <Image src="/brand/tripflix-logo.svg" alt={vi.app.name} width={142} height={42} priority />
        <div className="admin-login-collage" aria-hidden="true">
          <span className="admin-login-photo is-side">
            <Image src="/brand/hoian.jpg" alt="" fill sizes="240px" />
          </span>
          <span className="admin-login-photo is-main">
            <Image src="/brand/sea.jpg" alt="" fill sizes="320px" priority />
          </span>
          <span className="admin-login-mascot">
            <Image src="/brand/tripi-welcome.png" alt="" width={180} height={180} />
          </span>
        </div>
        <div>
          <p className="admin-eyebrow">{vi.admin.title}</p>
          <h1 className="admin-login-headline">
            {vi.api.authHeroFirst} <em>{vi.api.authHeroSecond}</em>
          </h1>
        </div>
      </section>
      <section className="admin-login-content">
        <div className="admin-login-card">
          <h2>{vi.api.login}</h2>
          <p className="admin-login-note">{vi.api.staffOnly}</p>
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
            <div className="admin-login-field">
              {MAIL_ICON}
              {/* Nhãn nổi dựa vào :placeholder-shown nên ô cần placeholder là khoảng trắng. */}
              <input
                id="admin-email"
                type="email"
                required
                placeholder=" "
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="admin-email">{vi.api.email}</label>
            </div>
            <div className="admin-login-field">
              {LOCK_ICON}
              <input
                id="admin-password"
                type={isPasswordVisible ? 'text' : 'password'}
                required
                placeholder=" "
                autoComplete="current-password"
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label htmlFor="admin-password">{vi.api.password}</label>
              <button
                type="button"
                className="admin-login-eye"
                aria-label={isPasswordVisible ? vi.api.hidePasswordLabel : vi.api.showPasswordLabel}
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                {isPasswordVisible ? EYE_CLOSED : EYE_OPEN}
              </button>
            </div>
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
