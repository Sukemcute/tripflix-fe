import { t, vi } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: t('app.name'),
  description: t('app.slogan'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-background text-text antialiased">
        <a href="#content" className="skip-link">
          {vi.demo.common.explore}
        </a>
        <Providers>
          <header className="ota-header">
            <div className="ota-container header-content">
              <Link href="/" aria-label={vi.demo.common.logo}>
                <Image
                  src="/brand/tripflix-logo.svg"
                  alt={vi.demo.common.logo}
                  width={142}
                  height={42}
                  priority
                />
              </Link>
              <nav aria-label={vi.demo.common.explore}>
                <Link href="/search">{vi.demo.web.navTrips}</Link>
                <Link href="/#how">{vi.demo.web.navAbout}</Link>
              </nav>
              <span className="demo-badge">{vi.demo.common.badge}</span>
            </div>
          </header>
          {children}
          <footer className="ota-footer ota-container">
            <strong>{vi.demo.web.footer}</strong>
            <p>{vi.demo.common.notice}</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
