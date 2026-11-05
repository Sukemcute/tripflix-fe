'use client';
import { useApiSession, HttpError, socialApi } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { PublicPosts } from '@/features/social/live-posts';

export function LiveLogin({ returnTo = '/account' }: { returnTo?: string }) {
  const { session, isReady, error } = useApiSession();
  const router = useRouter();
  const [isRegistering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      isRegistering
        ? session.register({ email: email.trim(), password, displayName: displayName.trim() })
        : session.login({ email: email.trim(), password }),
    onSuccess: () => {
      setPassword('');
      router.replace(/^\/(?:account|trips\/[^/?#]+|search)(?:$|[?#])/.test(returnTo) ? returnTo : '/account');
    },
  });
  return (
    <main id="content" className="ota-container results-page">
      <h1>{isRegistering ? vi.api.register : vi.api.login}</h1>
      <p>{vi.api.loginBody}</p>
      <ApiErrorNotice
        error={error}
        retry={() => {
          void session.initialize();
        }}
      />
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        {isRegistering && (
          <label>
            {vi.api.displayName}
            <input
              required
              maxLength={50}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        <label>
          {vi.api.email}
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          {vi.api.password}
          <input
            type="password"
            required
            minLength={isRegistering ? 8 : 1}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
          />
        </label>
        {isRegistering && <p>{vi.api.registerHint}</p>}
        {mutation.error instanceof HttpError && mutation.error.status === 401 ? (
          <p role="alert">{vi.api.wrongCredentials}</p>
        ) : (
          <ApiErrorNotice error={mutation.error} />
        )}
        <button className="primary-button" disabled={!isReady || mutation.isPending}>
          {mutation.isPending ? vi.api.loggingIn : isRegistering ? vi.api.register : vi.api.login}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={mutation.isPending}
          onClick={() => {
            setRegistering(!isRegistering);
            mutation.reset();
          }}
        >
          {isRegistering ? vi.api.haveAccount : vi.api.noAccount}
        </button>
      </form>
    </main>
  );
}
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
    <main id="content" className="ota-container results-page">
      <h1>{user.displayName}</h1>
      <p>{user.email}</p>
      <nav className="filter-bar">
        {(['profile', 'mine', 'bookmarks', 'create'] as const).map((kind) => (
          <button
            key={kind}
            className="secondary-button"
            aria-pressed={tab === kind}
            onClick={() => setTab(kind)}
          >
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
        <ProfileEditor key={user.id} displayName={user.displayName} userId={user.id} />
      ) : tab === 'create' ? (
        <CreateDraft />
      ) : (
        <PublicPosts kind={tab} />
      )}
    </main>
  );
}
function ProfileEditor({ displayName, userId }: { displayName: string; userId: string }) {
  const { session } = useApiSession();
  const client = useQueryClient();
  const [name, setName] = useState(displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const query = useQuery({
    queryKey: ['account', 'sessions', userId],
    queryFn: async ({ signal }) => (await auth.accountControllerListSessions({ signal })).data,
  });
  const mutation = useMutation({
    mutationFn: async (action: 'profile' | 'password' | 'logout' | 'logoutAll' | { revoke: string }) => {
      if (action === 'profile') {
        await auth.accountControllerUpdateProfile({ displayName: name.trim() });
        await session.reloadUser();
      } else if (action === 'password')
        await auth.accountControllerChangePassword({ currentPassword, newPassword });
      else if (action === 'logout') await session.logout();
      else if (action === 'logoutAll') await session.logoutAll();
      else {
        await auth.accountControllerRevokeSession(encodeURIComponent(action.revoke));
        if (query.data?.find((device) => device.id === action.revoke)?.isCurrent) await session.initialize();
      }
    },
    onSuccess: async (_, action) => {
      if (action === 'password') {
        setCurrentPassword('');
        setNewPassword('');
      }
      await client.invalidateQueries({ queryKey: ['account'] });
    },
  });
  return (
    <>
      <ApiErrorNotice error={mutation.error} />
      {mutation.isSuccess && <output>{vi.api.saved}</output>}
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate('profile');
        }}
      >
        <label>
          {vi.api.displayName}
          <input value={name} required maxLength={50} onChange={(event) => setName(event.target.value)} />
        </label>
        <button className="primary-button" disabled={mutation.isPending || !name.trim()}>
          {vi.api.save}
        </button>
      </form>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate('password');
        }}
      >
        <h2>{vi.api.changePassword}</h2>
        <label>
          {vi.api.currentPassword}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          {vi.api.newPassword}
          <input
            type="password"
            minLength={8}
            maxLength={128}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={mutation.isPending}>
          {vi.api.changePassword}
        </button>
      </form>
      <h2>{vi.api.sessions}</h2>
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <p>{vi.api.loading}</p>}
      {query.data?.map((device) => (
        <section className="detail-section" key={device.id}>
          <h3>
            {device.deviceName ?? vi.api.unknownDevice}
            {device.isCurrent ? ` · ${vi.api.currentSession}` : ''}
          </h3>
          <p>{new Date(device.lastUsedAt).toLocaleString('vi-VN')}</p>
          <button
            className="secondary-button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ revoke: device.id })}
          >
            {vi.api.revoke}
          </button>
        </section>
      ))}
      <div className="filter-bar">
        <button
          className="secondary-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('logoutAll')}
        >
          {vi.api.logoutAll}
        </button>
        <button
          className="secondary-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('logout')}
        >
          {vi.api.logout}
        </button>
      </div>
    </>
  );
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
