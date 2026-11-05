import { t } from '@tripflix/i18n';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: t('admin.title'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-surface text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
