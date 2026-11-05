'use client';

import { vi } from '@tripflix/i18n';
import { useActionState } from 'react';
import { loginAdminPreview } from './actions';

export function LoginForm({ returnTo, enabled }: { returnTo: string; enabled: boolean }) {
  const [state, action, isPending] = useActionState(loginAdminPreview, {});
  const copy = vi.demo.admin;
  return (
    <form action={action} className="admin-login-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor="admin-email">{copy.email}</label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder={copy.emailPlaceholder}
      />
      <label htmlFor="admin-code">{copy.code}</label>
      <input
        id="admin-code"
        name="code"
        autoComplete="off"
        required
        maxLength={32}
        aria-describedby="code-help"
      />
      <p id="code-help" className="admin-helper">
        {copy.codeHelp}
      </p>
      {state.error && (
        <p role="alert" className="admin-error">
          {state.error}
        </p>
      )}
      {!enabled && (
        <p role="alert" className="admin-error">
          {copy.unavailable}
        </p>
      )}
      <button type="submit" className="admin-primary" disabled={isPending || !enabled}>
        {isPending ? copy.pending : copy.submit}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="admin-helper">{copy.sessionNotice}</p>
    </form>
  );
}
