import { t, vi } from '@tripflix/i18n';
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
// Sau globals.css để header điện thoại (TF98) thắng các rule header cũ.
import '@/features/shell/mobile-header.css';
import { HeaderAccount } from '@/features/auth/header-account';
import { AssistantHeaderButton } from '@/features/assistant/assistant-widget';
import { CartLink } from '@/features/checkout/cart-link';
import { HeaderNotifications } from '@/features/notifications/header-notifications';
import { Providers } from './providers';
import { OtaNavigation } from '@/features/discovery/ota-navigation';
import { OtaFooter } from '@/features/discovery/ota-footer';
import { ButtonRipple } from '@/features/shared/button-ripple';
import { DEFAULT_OG_IMAGE } from '@/features/seo/page-metadata';
import { getSiteUrl } from '@/lib/site';

// Metadata mặc định cho mọi trang (TF112): metadataBase biến link tương đối (canonical, ảnh) thành tuyệt đối.
// Trang con tự đặt title đầy đủ, nên không dùng title.template để tránh lặp "| Tripflix". Canonical và og:url
// không đặt ở đây vì mọi trang con sẽ kế thừa; trang nào cần thì tự khai.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: vi.seo.defaultTitle,
  description: vi.seo.defaultDescription,
  applicationName: t('app.name'),
  openGraph: {
    type: 'website',
    siteName: t('app.name'),
    locale: 'vi_VN',
    title: vi.seo.defaultTitle,
    description: vi.seo.defaultDescription,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: vi.seo.defaultTitle,
    description: vi.seo.defaultDescription,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// viewport-fit=cover để env(safe-area-inset-*) có giá trị trên iPhone (header dính, thanh đáy sau này).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-background text-text antialiased">
        <Providers>
          <ButtonRipple />
          <header className="ota-header" id="top">
            <div className="ota-container header-content">
              <Link prefetch={false} href="/" aria-label={vi.demo.common.logo} className="header-brand">
                <Image
                  src="/brand/tripflix-logo.svg"
                  alt={vi.demo.common.logo}
                  width={142}
                  height={42}
                  priority
                  className="header-logo-dark"
                />
                <Image
                  src="/brand/tripflix-logo-white.svg"
                  alt=""
                  aria-hidden="true"
                  width={142}
                  height={42}
                  priority
                  className="header-logo-light"
                />
              </Link>
              <OtaNavigation />
              {/* Cụm bên phải: giỏ hàng, chuông, tài khoản trong một viên cùng kiểu menu (TF06P). */}
              <div className="header-actions">
                <AssistantHeaderButton />
                <CartLink />
                <HeaderNotifications />
                <HeaderAccount />
              </div>
            </div>
          </header>
          {children}
          <OtaFooter />
        </Providers>
      </body>
    </html>
  );
}
