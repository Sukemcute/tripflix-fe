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

// Màn đăng nhập nằm ở login-form.tsx; giữ export ở đây để app/login/page.tsx không phải đổi.
export { LiveLogin } from './login-form';

export function LiveAccount() {
  const { user, isReady, session, error } = useApiSession();
  const [tab, setTab] = useState<'profile' | 'mine' | 'bookmarks' | 'create'>('profile');
  if (!isReady)
    return (
      <main id="content" className="ota-container results-page">
        <output>{vi.api.loading}</output>
      </main>
    );
  if (!user)
    return (
      <main id="content" className="ota-container results-page">
        <ApiErrorNotice
          error={error}
          retry={() => {
            void session.initialize();
          }}
        />
        <Link className="primary-button" href="/login">
          {vi.api.loginRequired}
        </Link>
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
            {user.email}
            <span className="account-role">{describeRole(user.role)}</span>
          </p>
        </div>
        <Image className="account-mascot" src="/brand/tripi-welcome.png" alt="" width={120} height={120} />
      </header>
      <nav className="account-tabs" aria-label={vi.api.accountSections}>
        {(['profile', 'mine', 'bookmarks', 'create'] as const).map((kind) => (
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
/** Chữ cái đầu của tên để làm avatar; tên trống thì dùng dấu chấm. */
function getInitial(displayName: string): string {
  return Array.from(displayName.trim())[0]?.toUpperCase() ?? '·';
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
