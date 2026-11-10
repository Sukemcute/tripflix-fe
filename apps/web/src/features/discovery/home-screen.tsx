import { InspirationView } from '@/features/social/inspiration-view';

/** Trang Cam hung: Giao dien Adaptive Split View cho Bai viet va Immersive 3-Panel Viewer cho Reels. */
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
      <InspirationView initialKeyword={query} />
    </main>
  );
}
