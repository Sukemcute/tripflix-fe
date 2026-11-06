import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import styles from './hotel-listing.module.css';
import { OTA_DESTINATIONS, getDestinationHref } from './ota-destinations';

// shortcut: banner tĩnh trỏ tới Đà Nẵng; khi có API quảng cáo thì lấy nội dung từ đó.
const AD_DESTINATION = OTA_DESTINATIONS[2];

export function SearchAdBanner() {
  return (
    <aside className={styles.adBanner} aria-label={vi.ota.adLabel}>
      <div className={styles.adPhoto}>
        {/* Ảnh dọc 900×1125 phủ cả banner cao ~800px nên cần bản rộng ~640px. */}
        <Image src="/brand/beach.jpg" alt="" fill sizes="(max-width: 840px) 1px, 640px" />
      </div>
      <div className={styles.adContent}>
        <Image className={styles.adTripi} src="/brand/tripi-depart.png" alt="" width={84} height={84} />
        <p className={styles.adEyebrow}>{vi.ota.adEyebrow}</p>
        <h2>{vi.ota.adTitle}</h2>
        <p>{vi.ota.adBody}</p>
        <ul className={styles.adHighlights}>
          {vi.ota.adHighlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <Link className="primary-button" href={getDestinationHref(AD_DESTINATION)}>
          {vi.ota.adAction}
        </Link>
      </div>
    </aside>
  );
}
