import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import styles from './ota-hero.module.css';

const ACTIVITIES = [
  ['home-shore.jpg', vi.api.otaActivities.beach],
  ['home-surf.jpg', vi.api.otaActivities.surf],
  ['home-kayaking.jpg', vi.api.otaActivities.kayak],
] as const;

export function OtaHero() {
  return (
    <header className={styles.hero}>
      <div className={`ota-container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            <span aria-hidden="true">✳</span> Tripflix / {vi.ota.fieldNotes}
          </p>
          <h1>{vi.app.slogan.replace(', ', ',\n')}</h1>
          <p className={styles.description}>{vi.ota.heroIntro}</p>
          <div className={styles.actions}>
            <a className={styles.searchAction} href="#ota-search">
              {vi.ota.heroSearch} <span aria-hidden="true">↗</span>
            </a>
            <a className={styles.scrollAction} href="#home-destinations">
              <span aria-hidden="true">↓</span> {vi.ota.heroExplore}
            </a>
          </div>
          <div className={styles.activities}>
            <p>{vi.api.otaActivityLabel}</p>
            <div>
              {ACTIVITIES.map(([image, name]) => (
                <Link key={image} href={{ pathname: '/inspiration', query: { q: name } }}>
                  <Image src={`/brand/${image}`} alt="" width={40} height={40} />
                  <span>{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <figure className={styles.art} data-home-banner>
          <div className={styles.frame}>
            <Image
              className={styles.photo}
              src="/brand/home-kayak-source.jpg"
              alt={vi.ota.heroPhoto}
              fill
              sizes="(max-width: 760px) 95vw, 55vw"
              preload
            />
            <span className={styles.frameIndex} aria-hidden="true">
              01
            </span>
            <svg className={styles.route} viewBox="0 0 150 210" fill="none" aria-hidden="true">
              <path
                d="M 20 190 C 106 168 17 121 81 101 S 155 35 117 19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
              <circle cx="20" cy="190" r="5" fill="currentColor" />
              <circle cx="117" cy="19" r="5" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.tripiGreeting}>
            <Image src="/brand/tripi-welcome.png" alt="" width={64} height={64} />
            <span>{vi.ota.tripiGreeting}</span>
          </div>
          <figcaption className={styles.caption}>
            <span aria-hidden="true">✦</span>
            {vi.ota.heroFrame}
          </figcaption>
        </figure>
      </div>
    </header>
  );
}
