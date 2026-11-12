import { vi } from '@tripflix/i18n';
import styles from './reel-loader.module.css';

/** Loader hai chấm (coral, teal) cho Reel đang tải; tự trễ 250ms mới hiện để không nháy khi tải nhanh. */
export function ReelLoader({ className = '' }: { className?: string }) {
  return (
    <output className={`${styles.loader} ${className}`} aria-label={vi.api.loading}>
      <span className={`${styles.dot} ${styles.dotLead}`} aria-hidden="true" />
      <span className={`${styles.dot} ${styles.dotTrail}`} aria-hidden="true" />
    </output>
  );
}
