'use client';
import { useApiSession, socialApi } from '@tripflix/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { PublicPosts } from '@/features/social/live-posts';
import { AccountSecurity } from './account-security';
import { ACCOUNT_TABS, type AccountTab } from './account-tabs';
import { ADMIN_URL, getInitial, isStaffRole } from './account-helpers';

// Màn đăng nhập nằm ở login-form.tsx; giữ export ở đây để app/login/page.tsx không phải đổi.
export { LiveLogin } from './login-form';

export function LiveAccount({ initialTab = 'profile' }: { initialTab?: AccountTab }) {
  const { user, isReady, session, error } = useApiSession();
  const [tab, setTab] = useState<AccountTab>(initialTab);
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
      <header className="account-hero">
        <span className="account-avatar" aria-hidden="true">
          {getInitial(user.displayName)}
        </span>
        <div className="account-identity">
          <h1>{user.displayName}</h1>
          <p>
            <span className="account-email">{user.email}</span>
            <span className="account-role">{describeRole(user.role)}</span>
          </p>
        </div>
        <Image className="account-mascot" src="/brand/tripi-welcome.png" alt="" width={120} height={120} />
      </header>
      <AdminAreaCard role={user.role} />
      <nav className="account-tabs" aria-label={vi.api.accountSections}>
        {ACCOUNT_TABS.map((kind) => (
          <button key={kind} type="button" aria-pressed={tab === kind} onClick={() => setTab(kind)}>
            {kind === 'profile'
              ? vi.api.account
              : kind === 'mine'
                ? vi.api.myPosts
                : kind === 'bookmarks'
                  ? vi.api.bookmarks
                  : vi.api.create}
          </button>
        ))}
      </nav>
      {tab === 'profile' ? (
        <AccountSecurity key={user.id} displayName={user.displayName} userId={user.id} />
      ) : tab === 'create' ? (
        <CreateDraft />
      ) : (
        <PublicPosts kind={tab} />
      )}
    </main>
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

/** Thẻ dẫn sang trang quản trị, chỉ hiện với kiểm duyệt viên và quản trị viên. */
function AdminAreaCard({ role }: { role: string }) {
  if (!ADMIN_URL || !isStaffRole(role)) return null;
  return (
    <section className="account-admin" aria-labelledby="account-admin-title">
      <div>
        <h2 id="account-admin-title">{vi.api.adminAreaTitle}</h2>
        <p>{role === 'superadmin' ? vi.api.adminAreaSuperadmin : vi.api.adminAreaModerator}</p>
      </div>
      <a className="primary-button" href={ADMIN_URL}>
        {vi.api.openAdmin}
      </a>
    </section>
  );
}

function describeRole(role: string): string {
  if (role === 'superadmin') return vi.api.superadmin;
  if (role === 'moderator') return vi.api.moderator;
  return vi.api.user;
}

function CreateDraft() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [id, setId] = useState<string>();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      id
        ? socialApi.updatePost(id, { title: title.trim(), body })
        : socialApi.createDraft({ title: title.trim(), body, post_type: 'vlog' }),
    onSuccess: async (post) => {
      setId(post.id);
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <h2>{vi.api.create}</h2>
      <p>{vi.api.mediaUnavailable}</p>
      <label>
        {vi.api.title}
        <input required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {vi.api.body}
        <textarea aria-label={vi.api.body} value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <ApiErrorNotice error={mutation.error} />
      {mutation.isSuccess && <output>{vi.api.draftSaved}</output>}
      <button className="primary-button" disabled={mutation.isPending || !title.trim()}>
        {mutation.isPending ? vi.api.saving : vi.api.saveDraft}
      </button>
      {id && (
        <Link className="secondary-button" href={`/trips/${id}`}>
          {vi.api.detail}
        </Link>
      )}
    </form>
  );
}
