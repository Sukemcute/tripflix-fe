import { PublicPosts } from '@/features/social/live-posts';

/** Trang Cảm hứng: hiển thị trực tiếp giao diện Immersive 3-Panel Viewer (Lịch trình / Media Stage / Bình luận). */
export default function HomeScreen({ query = '', queryError }: { query?: string; queryError?: string }) {
  return (
    <main id="content">
      {queryError && (
        <div className="ota-container">
          <p className="field-error" role="alert">
            {queryError}
          </p>
        </div>
      )}
      <PublicPosts keyword={query} />
    </main>
  );
}
