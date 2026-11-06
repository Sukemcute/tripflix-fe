import { t, vi } from '@tripflix/i18n';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';
import { HeaderAccount } from '@/features/auth/header-account';
import { Providers } from './providers';
import { OtaNavigation } from '@/features/discovery/ota-navigation';
import { OTA_DESTINATIONS, getDestinationHref } from '@/features/discovery/ota-destinations';
import styles from '@/features/discovery/ota-shell.module.css';

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
              <HeaderAccount />
            </div>
          </header>
          {children}
          <footer className={styles.footer}>
            <div className={`ota-container ${styles.footerGrid}`}>
              <div className={styles.footerIdentity}>
                <Link className={styles.footerBrand} href="/">
                  <Image src="/brand/tripflix-logo.svg" alt={vi.demo.common.logo} width={142} height={42} />
                </Link>
                <strong>{vi.app.slogan}</strong>
                <p>{vi.ota.footerCopy}</p>
              </div>
              <nav aria-label={vi.ota.footerExplore}>
                <strong>{vi.ota.footerExplore}</strong>
                <Link href="/search">{vi.api.hotels}</Link>
                <Link href="/flights">{vi.flights.title}</Link>
                <Link href="/#home-destinations">{vi.ota.discover}</Link>
                <Link href="/inspiration">{vi.api.inspiration}</Link>
              </nav>
              <nav aria-label={vi.ota.footerDestinations}>
                <strong>{vi.ota.footerDestinations}</strong>
                {OTA_DESTINATIONS.map((destination) => (
                  <Link key={destination.id} href={getDestinationHref(destination)}>
                    <span className={styles.footerThumbnail}>
                      <Image src={destination.image} alt="" fill sizes="32px" />
                    </span>
                    {destination.name}
                  </Link>
                ))}
              </nav>
              <div className={styles.footerPostcard}>
                <div>
                  <h2>{vi.ota.footerTitle}</h2>
                  <Link className={styles.footerAction} href="/#ota-search">
                    {vi.ota.heroSearch}
                  </Link>
                </div>
                <span className={styles.footerPostcardPhoto}>
                  <Image src="/brand/home-shore.jpg" alt="" fill sizes="88px" />
                </span>
              </div>
            </div>
            <div className={`ota-container ${styles.footerBase}`}>
              <p>
                <span aria-hidden="true" />
                {vi.api.bookingUnavailable}
              </p>
              <a href="#top">
                {vi.ota.backToTop}
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
