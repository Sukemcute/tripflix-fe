import Image from 'next/image';
import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import styles from './ota-hero.module.css';

const activities = [
  ['home-shore.jpg', vi.api.otaActivities.beach],
  ['home-surf.jpg', vi.api.otaActivities.surf],
  ['home-kayaking.jpg', vi.api.otaActivities.kayak],
] as const;

export function OtaHero() {
  return (
    <header className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.art} aria-hidden="true">
          <Image
            className={styles.world}
            src="/brand/home-world.svg"
            alt=""
            width={800}
            height={600}
            unoptimized
          />
          <Image
            className={styles.water}
            src="/brand/home-water-figma.svg"
            alt=""
            width={656}
            height={793}
            unoptimized
          />
          <div className={styles.orbits}>
            <i />
            <i />
            <i />
          </div>
          <svg width="0" height="0">
            <defs>
              <clipPath id="ota-kayak-clip" clipPathUnits="objectBoundingBox">
                <path
                  transform="scale(.0006666667 .0005333333)"
                  d="M 475 624 C 499 638 538 653 588 677 L 791 778 L 804 756 Q 792 737 809 730 Q 822 719 847 724 L 879 748 Q 921 742 946 758 Q 983 779 993 811 Q 1018 834 1027 882 L 1031 962 Q 1097 1002 1162 1051 Q 1224 1090 1271 1145 Q 1323 1194 1386 1252 L 1412 1309 L 1433 1299 L 1460 1196 Q 1469 1178 1444 1165 L 1427 1158 Q 1414 1149 1423 1134 L 1435 1114 L 1440 1089 L 1435 1068 Q 1434 1045 1461 1034 Q 1481 1023 1500 1022 L 1500 1812 Q 1398 1758 1285 1676 Q 1180 1595 1094 1525 Q 1001 1449 923 1377 Q 840 1306 785 1243 Q 695 1167 647 1117 L 580 1038 Q 536 995 504 931 Q 471 878 458 818 Q 437 752 431 698 Q 427 654 444 641 L 464 632 L 469 622 Z"
                />
                <path
                  transform="scale(.0006666667 .0005333333)"
                  d="M 270 1250 Q 278 1210 316 1175 Q 355 1138 403 1112 L 460 1086 L 493 1051 L 809 766 L 821 750 L 840 742 L 928 652 L 948 628 Q 956 597 990 554 Q 1041 491 1088 482 Q 1112 474 1127 481 Q 1129 490 1118 505 Q 1088 547 1045 587 Q 1004 623 966 637 L 943 660 L 851 750 L 832 767 L 513 1065 L 487 1093 Q 465 1120 416 1155 L 314 1230 Q 288 1250 270 1250 Z"
                />
              </clipPath>
            </defs>
          </svg>
          <Image
            className={styles.kayak}
            src="/brand/home-kayak-source.jpg"
            alt=""
            width={1500}
            height={1875}
            sizes="(max-width: 640px) 100vw, 60vw"
            preload
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{vi.api.otaKicker}</p>
          <h1>{vi.api.otaTitle}</h1>
          <p className={styles.description}>{vi.api.otaIntro}</p>
          <p className={styles.activityLabel}>{vi.api.otaActivityLabel}</p>
          <div className={styles.activities}>
            {activities.map(([image, name]) => (
              <Link className={styles.activity} href="/inspiration" key={image}>
                <Image
                  src={`/brand/${image}`}
                  alt=""
                  width={220}
                  height={220}
                  sizes="(max-width: 640px) 28vw, 15vw"
                />
                <strong>{name}</strong>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
