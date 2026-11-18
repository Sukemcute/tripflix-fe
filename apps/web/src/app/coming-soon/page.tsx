import type { Metadata } from 'next';
import Link from 'next/link';
import { TripiMascot } from '@/features/mascot/tripi-mascot';
import styles from './coming-soon.module.css';

export const metadata: Metadata = {
  title: 'Tripflix sắp ra mắt ứng dụng',
  description: 'Ứng dụng Tripflix đang chờ duyệt trên cửa hàng ứng dụng.',
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string | string[] }>;
}) {
  const params = await searchParams;
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const tripHref = postId ? `/trip-plans/${encodeURIComponent(postId)}` : '/inspiration';

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="coming-soon-title">
        <div className={styles.copy}>
          <span className={styles.kicker}><span className={styles.dot} /> TRIPFLIX APP · COMING SOON</span>
          <h1 id="coming-soon-title">Tripi đang chuẩn bị hành lý!</h1>
          <p className={styles.lead}>
            Ứng dụng Tripflix đang trong quá trình chờ duyệt trên App Store và Google Play. Tripi sẽ báo bạn ngay khi
            sẵn sàng lên đường.
          </p>
          <div className={styles.note}>
            <span className={styles.noteIcon} aria-hidden="true">✦</span>
            <p>Trong lúc chờ, bạn vẫn có thể xem chi tiết lộ trình trên web. Tính năng đặt cả combo sẽ có trên app.</p>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href={tripHref}>
              Quay lại lộ trình <span aria-hidden="true">→</span>
            </Link>
            {postId && (
              <a className={styles.secondaryButton} href={`tripflix://trip-plans/${encodeURIComponent(postId)}`}>
                Đã cài app? Mở để đặt
              </a>
            )}
          </div>
        </div>

        <div className={styles.mascotStage} aria-label="Tripi đang chuẩn bị cho chuyến đi">
          <span className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
          <span className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
          <span className={`${styles.sparkle} ${styles.sparkleOne}`} aria-hidden="true">✦</span>
          <span className={`${styles.sparkle} ${styles.sparkleTwo}`} aria-hidden="true">✧</span>
          <div className={styles.mascot}>
            <TripiMascot pose="action-depart" size={300} alt="Tripi đeo ba lô, sẵn sàng lên đường" />
          </div>
          <span className={styles.stamp}>SẮP<br />LÊN ĐƯỜNG</span>
        </div>
      </section>
      <p className={styles.footerLine}>Cùng Tripi, chuyến đi hay bắt đầu từ một lộ trình.</p>
    </main>
  );
}
