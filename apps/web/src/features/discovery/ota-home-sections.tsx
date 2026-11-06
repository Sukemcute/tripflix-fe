import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';
import { HomeStayPreview, HomeStoryPreview } from './ota-home-previews';
import styles from './ota-home.module.css';

export function OtaHomeSections() {
  return (
    <>
      <section
        id="home-destinations"
        className={`ota-container ${styles.section}`}
        aria-labelledby="destinations-title"
        data-home-reveal
      >
        <div className={styles.sectionHead}>
          <div>
            <h2 id="destinations-title">{vi.ota.destinationTitle}</h2>
            <p>{vi.ota.destinationIntro}</p>
          </div>
          <Link className={styles.textLink} href="/search">
            {vi.ota.browseHotels}
          </Link>
        </div>
        <div className={styles.destinations}>
          {OTA_DESTINATIONS.map((destination) => (
            <Link
              key={destination.id}
              href={getDestinationHref(destination)}
              className={styles.destination}
              aria-label={t('ota.browseDestination', { name: destination.name })}
              data-home-banner
            >
              <Image src={destination.image} alt="" fill sizes="(max-width: 640px) 100vw, 48vw" />
              <div>
                <span>{destination.region}</span>
                <h3>{destination.name}</h3>
                <p>{destination.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <HomeStayPreview />
      <section
        className={`ota-container ${styles.section}`}
        aria-labelledby="home-tripi-title"
        data-home-reveal
      >
        <div className={styles.tripiBanner} data-home-banner>
          <div className={styles.tripiCopy}>
            <h2 id="home-tripi-title">{vi.ota.tripiTitle}</h2>
            <p className={styles.tripiIntro}>{vi.ota.tripiIntro}</p>
            <Link href="/inspiration" className={styles.tripiAction}>
              {vi.ota.tripiAction}
            </Link>
          </div>
          <div className={styles.tripiCollage} aria-hidden="true">
            <svg className={styles.tripiRoute} viewBox="0 0 500 360" fill="none">
              <path d="M 24 263 C 6 144 95 47 213 53 S 434 31 474 122 C 522 231 367 327 237 311 S 52 274 82 223" />
              <circle cx="24" cy="263" r="5" />
              <circle cx="82" cy="223" r="5" />
            </svg>
            <div className={`${styles.tripiPostcard} ${styles.tripiBeach}`}>
              <div className={styles.tripiPrint}>
                <Image src="/brand/home-shore.jpg" alt="" fill sizes="(max-width: 760px) 42vw, 240px" />
              </div>
              <span>{vi.api.otaActivities.beach}</span>
            </div>
            <div className={`${styles.tripiPostcard} ${styles.tripiTown}`}>
              <div className={styles.tripiPrint}>
                <Image
                  src="/brand/home-hoi-an-lanterns.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 760px) 42vw, 240px"
                />
              </div>
              <span>{vi.ota.destinations['hoi-an'].name}</span>
            </div>
            <Image
              className={styles.tripiMascot}
              src="/brand/tripi-curious.png"
              alt=""
              width={340}
              height={340}
              sizes="(max-width: 760px) 55vw, 340px"
            />
            <span className={styles.tripiStamp}>✦</span>
          </div>
        </div>
      </section>
      <HomeStoryPreview />
    </>
  );
}
