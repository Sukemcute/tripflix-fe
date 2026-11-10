import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import styles from './ota-hero.module.css';

const ACTIVITIES = [
  ['home-shore.jpg', vi.api.otaActivities.beach],
  ['home-surf.jpg', vi.api.otaActivities.surf],
  ['home-kayaking.jpg', vi.api.otaActivities.kayak],
] as const;

// Tách khẩu hiệu thành 2 dòng cố định: "Chạm cảm hứng," (đen, không xuống dòng) và "trọn hành trình".
const [SLOGAN_FIRST, SLOGAN_SECOND] = vi.app.slogan.split(', ');

export function OtaHero() {
  return (
    <header className={styles.hero}>
      <div className={`ota-container ${styles.inner}`}>
        <div className={styles.copy}>
          <Image
            className={styles.heroMascot}
            src="/brand/tripi-depart.png"
            alt=""
            width={116}
            height={116}
            sizes="(max-width: 760px) 74px, (max-width: 1013px) 76px, (max-width: 1547px) 7.5vw, 116px"
          />
          <h1>
            <span className={styles.titleFirst}>{SLOGAN_FIRST},</span> {SLOGAN_SECOND}
          </h1>
          <p className={styles.description}>{vi.ota.heroIntro}</p>
          <nav className={styles.activities} aria-label={vi.api.otaActivityLabel}>
            {ACTIVITIES.map(([image, name]) => (
              <Link key={image} href={{ pathname: '/inspiration', query: { q: name } }}>
                <Image src={`/brand/${image}`} alt="" width={40} height={40} />
                <span>{name}</span>
              </Link>
            ))}
          </nav>
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
        </figure>
      </div>
    </header>
  );
}
