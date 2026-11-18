import Link from 'next/link';
import styles from './app-download-badges.module.css';

export function AppDownloadBadges() {
  return (
    <section className={styles.section} aria-label="Tải ứng dụng Tripflix">
      <h2>Sắp có mặt trên điện thoại</h2>
      <div className={styles.badges}>
        <Link prefetch={false} href="/coming-soon" className={styles.badge} aria-label="Tải Tripflix trên App Store — sắp ra mắt">
          <svg className={styles.appleIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M16.37 12.64c.02 2.1 1.84 2.8 1.86 2.81-.02.05-.29 1.01-.96 2-.58.86-1.18 1.71-2.13 1.73-.93.02-1.23-.56-2.29-.56s-1.4.54-2.28.58c-.91.03-1.6-.93-2.18-1.78-1.19-1.72-2.1-4.86-.88-6.98.6-1.05 1.67-1.71 2.82-1.73.88-.02 1.71.6 2.29.6.58 0 1.57-.74 2.65-.63.45.02 1.71.18 2.52 1.36-.07.04-1.5.88-1.49 2.6ZM14.63 6.9c.48-.58.81-1.38.72-2.18-.69.03-1.53.46-2.03 1.04-.45.52-.84 1.33-.73 2.11.77.06 1.56-.39 2.04-.97Z" />
          </svg>
          <span className={styles.copy}><small>Download on the</small><strong>App Store</strong></span>
        </Link>
        <Link prefetch={false} href="/coming-soon" className={styles.badge} aria-label="Tải Tripflix trên Google Play — sắp ra mắt">
          <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#34A853" d="M2.4 1.2v21.6L13.7 12z" />
            <path fill="#4285F4" d="m2.4 1.2 13.2 7.9L19 5.8c.7-.5.5-1.2-.1-1.5L5.1.5c-1.2-.5-2.2-.2-2.7.7Z" />
            <path fill="#FBBC04" d="m15.6 14.9-13.2 7.9c.5.9 1.5 1.2 2.7.7L19 17.7c.6-.3.8-1 .1-1.5z" />
            <path fill="#EA4335" d="m19 5.8-3.4 2 4.1 2.5c1.2.7 1.2 1.7 0 2.4l-4.1 2.4 3.4 2 3.1-1.8c2.2-1.3 2.2-3.4 0-4.7z" />
          </svg>
          <span className={styles.copy}><small>GET IT ON</small><strong>Google Play</strong></span>
        </Link>
        <Link prefetch={false} href="/coming-soon" className={styles.badge} aria-label="Tải ứng dụng Tripflix miễn phí — sắp ra mắt">
          <svg className={styles.downloadIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1.3 4.6v6.1l2-2 1.5 1.5-4.8 4.8-4.8-4.8 1.5-1.5 2 2V6.6h2.6ZM7.5 18h9v1.8h-9z" />
          </svg>
          <span className={styles.copy}><small>GET FOR FREE</small><strong>Download</strong></span>
        </Link>
      </div>
    </section>
  );
}
