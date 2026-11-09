import { t, vi } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
import { HeaderAccount } from '@/features/auth/header-account';
import { CartLink } from '@/features/checkout/cart-link';
import { Providers } from './providers';
import { OtaNavigation } from '@/features/discovery/ota-navigation';
import { OtaFooter } from '@/features/discovery/ota-footer';
import { ButtonRipple } from '@/features/shared/button-ripple';

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
          <ButtonRipple />
          <header className="ota-header" id="top">
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
              <OtaNavigation />
              <CartLink />
              <HeaderAccount />
            </div>
          </header>
          {children}
          <OtaFooter />
        </Providers>
      </body>
    </html>
  );
}
