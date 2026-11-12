import { InspirationView } from '@/features/social/inspiration-view';

/** Trang Cam hung: Giao dien Adaptive Split View cho Bai viet va Immersive 3-Panel Viewer cho Reels. */
/** Từ khoá tìm kiếm (?q=) do InspirationView đọc thẳng từ URL; ở đây chỉ hiện lỗi từ khoá không hợp lệ. */
export default function HomeScreen({ queryError }: { queryError?: string }) {
  return (
    <main id="content">
      {queryError && (
        <div className="ota-container">
          <p className="field-error" role="alert">
            {queryError}
          </p>
        </div>
      )}
      <InspirationView />
    </main>
  );
}
