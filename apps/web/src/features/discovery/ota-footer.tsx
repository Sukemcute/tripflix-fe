'use client';
import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OTA_DESTINATIONS, getDestinationHref } from '@/features/discovery/ota-destinations';
import { TripiMascot } from '@/features/mascot/tripi-mascot';
import styles from '@/features/discovery/ota-shell.module.css';

export function OtaFooter() {
  const pathname = usePathname();

  // Ẩn footer ở tab Cảm hứng (/inspiration) để giao diện 3-panel immersive bao quát toàn màn hình
  if (pathname === '/inspiration') {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={`ota-container ${styles.footerGrid}`}>
        <div className={styles.footerIdentity}>
          <Link prefetch={false} className={styles.footerBrand} href="/">
            <Image src="/brand/tripflix-logo.svg" alt={vi.demo.common.logo} width={142} height={42} />
          </Link>
          <strong>{vi.app.slogan}</strong>
          <p>{vi.ota.footerCopy}</p>
          <Link prefetch={false} className={styles.footerLegal} href="/chinh-sach-bao-mat">
            {vi.privacy.footerLink}
          </Link>
        </div>
        <nav aria-label={vi.ota.footerExplore}>
          <strong>{vi.ota.footerExplore}</strong>
          <Link prefetch={false} href="/search">{vi.api.hotels}</Link>
          <Link prefetch={false} href="/flights">{vi.flights.title}</Link>
          <Link prefetch={false} href="/#home-destinations">{vi.ota.discover}</Link>
          <Link prefetch={false} href="/inspiration">{vi.api.inspiration}</Link>
        </nav>
        <nav aria-label={vi.ota.footerDestinations}>
          <strong>{vi.ota.footerDestinations}</strong>
          {OTA_DESTINATIONS.map((destination) => (
            <Link prefetch={false} key={destination.id} href={getDestinationHref(destination)}>
              <span className={styles.footerThumbnail}>
                <Image src={destination.image} alt="" fill sizes="32px" />
              </span>
              {destination.name}
            </Link>
          ))}
        </nav>
        <div className={styles.footerPostcard}>
          <div>
            <span className={styles.footerTag}>{vi.ota.footerTag}</span>
            <h2>{vi.ota.footerTitle}</h2>
            <a className={`ripple-button ${styles.footerAction}`} href="#top">
              {vi.ota.backToTop}
            </a>
          </div>
          <span className={styles.footerPostcardPhoto}>
            <Image src="/brand/home-shore.jpg" alt="" fill sizes="88px" />
          </span>
          <span className={styles.footerTape} aria-hidden="true" />
          <TripiMascot pose="action-vacation" size={104} alt="" className={styles.footerMascot} />
        </div>
      </div>
    </footer>
  );
}

