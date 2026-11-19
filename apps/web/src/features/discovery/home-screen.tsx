import { InspirationView } from '@/features/social/inspiration-view';
import { LivingBackground } from './LivingBackground';
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
      {/* Cùng mặt nước với trang chủ nhưng đứng yên: không cuộn, không theo chuột. */}
      <LivingBackground isStatic />
    </main>
  );
}
