import { t, vi, type MessageKey } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { logoutAdminPreview } from '../auth/actions';
import { requireAdminDemoSession } from '../auth/session';
import { adminNav } from './nav';
import { ModuleContent } from './module-content';

/** Keep the existing page contract; each tab now renders inside a protected preview shell. */
export async function PlaceholderPage({ label }: { label: MessageKey }) {
  const item = adminNav.find((entry) => entry.label === label);
  const session = await requireAdminDemoSession(item?.href ?? '/moderation');
  const copy = vi.demo;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo">
          <Image src="/brand/tripflix-logo.svg" alt={copy.common.logo} width={142} height={42} />
        </Link>
        <p className="admin-eyebrow">{copy.admin.label}</p>
        <nav aria-label={copy.admin.navigation}>
          {adminNav.map((entry, index) => (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={entry.label === label ? 'page' : undefined}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {t(entry.label)}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-badge">{copy.common.badge}</span>
          <p>{copy.admin.sessionNotice}</p>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>{t('admin.title')}</span>
          <div>
            <span className="admin-session-email">{session.email}</span>
            <form action={logoutAdminPreview}>
              <button className="admin-secondary" type="submit">
                {copy.admin.logout}
              </button>
            </form>
          </div>
        </header>
        <main id="admin-content" className="admin-main">
          <ModuleContent key={label} label={label} />
        </main>
      </div>
    </div>
  );
}
