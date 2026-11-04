import { t } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { adminNav } from '@/features/shell/nav';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: t('admin.title'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-surface text-text antialiased">
        <Providers>
          <div className="flex min-h-dvh">
            <nav className="flex w-60 flex-col gap-1 border-r border-border bg-background p-4">
              <Link href="/" className="mb-4 text-lg font-extrabold text-navy">
                {t('admin.title')}
              </Link>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-text-muted hover:bg-surface-muted hover:text-navy"
                >
                  {t(item.label)}
                </Link>
              ))}
            </nav>
            <main className="flex-1 p-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
