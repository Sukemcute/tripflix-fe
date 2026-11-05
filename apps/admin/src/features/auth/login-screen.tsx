import { getDemoAdminReturnPath } from '@tripflix/app-core';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/login-form';
import { getAdminDemoSession, isDemoLoginEnabled } from '@/features/auth/session';

export default async function LoginScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { returnTo: raw } = await searchParams;
  const returnTo = getDemoAdminReturnPath(raw);
  if (await getAdminDemoSession()) redirect(returnTo);
  const copy = vi.demo;
  return (
    <main className="admin-login">
      <section className="admin-login-story">
        <Image src="/brand/tripflix-logo.svg" alt={copy.common.logo} width={160} height={48} priority />
        <div>
          <p className="admin-eyebrow">{copy.admin.label}</p>
          <h1>{copy.admin.loginTitle}</h1>
          <p>{copy.admin.loginBody}</p>
          <Image src="/brand/tripi-welcome.png" alt={vi.mobile.common.mascot} width={230} height={230} />
        </div>
        <span className="admin-badge">{copy.common.badge}</span>
      </section>
      <section className="admin-login-content">
        <div>
          <span className="admin-eyebrow">{copy.admin.workspace}</span>
          <h2>{copy.admin.loginHeading}</h2>
          <LoginForm returnTo={returnTo} enabled={isDemoLoginEnabled()} />
        </div>
      </section>
    </main>
  );
}
