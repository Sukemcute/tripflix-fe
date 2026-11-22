import { InspirationView } from '@/features/social/inspiration-view';
import Image from 'next/image';
import styles from './ota-home-motion.module.css';

/** Trang Cam hung: Giao dien Adaptive Split View cho Bai viet va Immersive 3-Panel Viewer cho Reels. */
/** Từ khoá tìm kiếm (?q=) do InspirationView đọc thẳng từ URL; ở đây chỉ hiện lỗi từ khoá không hợp lệ. */
export default function HomeScreen({ queryError }: { queryError?: string }) {
  return (
    <main id="content" className={styles.layeredCanvas}>
      <div className={styles.waterContent}>
        {queryError && (
          <div className="ota-container">
            <p className="field-error" role="alert">
              {queryError}
            </p>
          </div>
        )}
        <InspirationView />
      </div>
      {/* Cùng ảnh nền Hạ Long với trang chủ, làm mờ để phần nội dung nổi lên. */}
      <div className={styles.inspirationBackdrop} aria-hidden="true">
        <picture>
          <source media="(max-width: 640px)" srcSet="/brand/hero-layered-v1/ha-long-960.webp" />
          <Image src="/brand/hero-layered-v1/ha-long-1600.webp" alt="" fill unoptimized />
        </picture>
      </div>
    </main>
  );
}
