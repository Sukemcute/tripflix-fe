import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import styles from './flights.module.css';

const copy = vi.flights;
const steps = [copy.stepRoute, copy.stepFare, copy.stepHold];
const featurePhotos = ['/brand/sea.jpg', '/brand/hoian.jpg', '/brand/beach.jpg'];

/** activeStep: 1 khi chưa tìm, 2 khi đã có kết quả để chọn hạng ghế. */
export function FlightBanner({ activeStep }: { activeStep: 1 | 2 }) {
  return (
    <header className={styles.banner}>
      <div className={styles.bannerMedia} aria-hidden="true">
        <Image src="/brand/flight-sky.jpg" alt="" fill priority sizes="(max-width: 760px) 100vw, 70vw" />
      </div>
      <ol className={styles.steps} aria-label={copy.stepsLabel}>
        {steps.map((label, index) => (
          <li key={label} aria-current={index + 1 === activeStep ? 'step' : undefined} title={label}>
            <span aria-hidden="true">{index + 1}</span>
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>
      <div className={styles.bannerCopy}>
        <p className={styles.bannerEyebrow}>{copy.eyebrow}</p>
        <h1>
          <span className="sr-only">{copy.title}: </span>
          {copy.heroTitle}
        </h1>
        <p className={styles.bannerIntro}>{copy.heroIntro}</p>
      </div>
      <Image
        className={styles.bannerMascot}
        src="/brand/tripi-library/action-depart.png"
        alt=""
        width={240}
        height={240}
        priority
      />
      <div className={styles.feature}>
        <Link href="/inspiration" className={styles.featureCard}>
          <span className={styles.featureHead}>
            <strong>{copy.featureTitle}</strong>
            <span className={styles.featureArrow} aria-hidden="true">
              →
            </span>
          </span>
          <span className={styles.featureBody}>
            <span className={styles.featurePhotos} aria-hidden="true">
              {featurePhotos.map((src) => (
                <Image key={src} src={src} alt="" width={40} height={40} />
              ))}
            </span>
            <span className={styles.featureText}>
              <b>{copy.featureLink}</b>
              {copy.featureText}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
