'use client';
import { useApiSession } from '@tripflix/api-client';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { PublicPosts } from '@/features/social/live-posts';
import { PostComposer } from '@/features/social/post-composer';
import { ProfileInfoCard } from './account-profile';
import { AccountSecurity } from './account-security';
import { EmailVerificationNotice } from './email-verification-notice';
import { ACCOUNT_TABS, type AccountTab } from './account-tabs';
import { ADMIN_URL, getInitial, isStaffRole } from './account-helpers';

// Màn đăng nhập nằm ở login-form.tsx; giữ export ở đây để app/login/page.tsx không phải đổi.
export { LiveLogin } from './login-form';

/**
 * Trang tài khoản dạng hồ sơ (TF06M): cột trái avatar, thẻ thành viên, menu; bên phải nội dung mục đang chọn.
 * ?tab= mở sẵn một mục (xem account-tabs.ts).
 */
export function LiveAccount({ initialTab = 'profile' }: { initialTab?: AccountTab }) {
  const { user, isReady, session, error } = useApiSession();
  const router = useRouter();
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const logout = useMutation({
    mutationFn: () => session.logout(),
    onSuccess: () => router.push('/'),
  });
  if (!isReady)
    return (
      <main id="content" className="ota-container results-page account-page">
        <section className="account-guest is-loading" aria-busy="true">
          <output>{vi.api.loading}</output>
        </section>
      </main>
    );
  if (!user)
    return (
      <main id="content" className="ota-container results-page account-page">
        <ApiErrorNotice
          error={error}
          retry={() => {
            void session.initialize();
          }}
        />
        <AccountGuest />
      </main>
    );
  return (
    <main id="content" className="ota-container results-page account-page">
      <div className="profile-layout">
        <aside className="profile-aside">
          <div className="profile-identity">
            <span className="profile-avatar" aria-hidden="true">
              {getInitial(user.displayName)}
            </span>
            <h1>{user.displayName}</h1>
            <span className="account-role">{describeRole(user.role)}</span>
          </div>
          <nav className="profile-nav" aria-label={vi.api.accountNavLabel}>
            {ACCOUNT_TABS.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-current={tab === kind ? 'page' : undefined}
                onClick={() => setTab(kind)}
              >
                <NavIcon name={kind} />
                {TAB_LABELS[kind]}
              </button>
            ))}
            {ADMIN_URL && isStaffRole(user.role) && (
              <a href={ADMIN_URL}>
                <NavIcon name="admin" />
                {vi.api.openAdmin}
              </a>
            )}
            <button
              type="button"
              className="is-logout"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <NavIcon name="logout" />
              {vi.api.logout}
            </button>
          </nav>
          <ApiErrorNotice error={logout.error} />
        </aside>
        <div className="profile-main">
          {user.emailVerified === false && <EmailVerificationNotice key={`verify-${user.id}`} />}
          {tab === 'profile' ? (
            <ProfileInfoCard key={user.id} userId={user.id} />
          ) : tab === 'security' ? (
            <AccountSecurity key={user.id} userId={user.id} />
          ) : tab === 'create' ? (
            <PostComposer />
          ) : (
            <section className="profile-card" aria-label={TAB_LABELS[tab]}>
              <h2>{TAB_LABELS[tab]}</h2>
              <PublicPosts kind={tab} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

const TAB_LABELS: Record<AccountTab, string> = {
  profile: vi.api.profileInfoTitle,
  security: vi.api.accountNavSecurity,
  mine: vi.api.myPosts,
  bookmarks: vi.api.bookmarks,
  create: vi.api.create,
};

const NAV_ICONS: Record<AccountTab | 'admin' | 'logout', ReactNode> = {
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  security: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  mine: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  bookmarks: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  create: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  admin: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16 6 12l4-4M6 12h10" />
    </>
  ),
};

function NavIcon({ name }: { name: keyof typeof NAV_ICONS }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      {NAV_ICONS[name]}
    </svg>
  );
}

/** Trang tài khoản khi chưa đăng nhập: giải thích trang này để làm gì, nút Đăng nhập và Tạo tài khoản. */
function AccountGuest() {
  return (
    <section className="account-guest" aria-labelledby="account-guest-title">
      <div className="account-guest-body">
        <span className="eyebrow">{vi.api.authEyebrow}</span>
        <h1 id="account-guest-title">{vi.api.accountGuestTitle}</h1>
        <p>{vi.api.accountGuestBody}</p>
        <ul className="auth-benefits">
          {Object.values(vi.api.authBenefits).map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <div className="account-guest-actions">
          <Link className="primary-button" href="/login?returnTo=/account">
            {vi.api.login}
          </Link>
          <Link className="secondary-button" href="/login?mode=register&returnTo=/account">
            {vi.api.register}
          </Link>
        </div>
      </div>
      <Image
        className="account-guest-mascot"
        src="/brand/tripi-welcome.png"
        alt=""
        width={200}
        height={200}
      />
    </section>
  );
}

function describeRole(role: string): string {
  if (role === 'superadmin') return vi.api.superadmin;
  if (role === 'moderator') return vi.api.moderator;
  return vi.api.user;
}
