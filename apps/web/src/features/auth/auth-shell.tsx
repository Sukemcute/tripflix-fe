import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import type { ReactNode } from 'react';

const STORY = {
  login: { title: vi.api.authWelcomeTitle, body: vi.api.authWelcomeBody },
  register: { title: vi.api.authRegisterTitle, body: vi.api.authRegisterBody },
} as const;

/** Khung chung của các màn đăng nhập: bên trái lời chào và mascot, bên phải thẻ form. */
export function AuthShell({
  story = 'login',
  children,
}: {
  story?: keyof typeof STORY;
  children: ReactNode;
}) {
  const { title, body } = STORY[story];
  return (
    <main id="content" className="ota-container auth-page">
      <section className="auth-story">
        <span className="eyebrow">{vi.api.authEyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        <ul className="auth-benefits">
          {Object.values(vi.api.authBenefits).map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <Image
          className="auth-mascot"
          src="/brand/tripi-welcome.png"
          alt={vi.mobile.common.mascot}
          width={400}
          height={400}
          loading="eager"
        />
      </section>
      <section className="auth-card">{children}</section>
    </main>
  );
}
