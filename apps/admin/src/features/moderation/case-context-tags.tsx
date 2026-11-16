import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import styles from './risk-level.module.css';

const sourceLabels: Record<string, { label: string; hint: string; tone: string }> = {
  report: {
    label: 'Người dùng báo cáo',
    hint: 'Có báo cáo từ người dùng; chưa phải kết luận vi phạm.',
    tone: 'report',
  },
  ai: { label: 'AI gắn cờ', hint: 'Mô hình AI phát hiện dấu hiệu cần kiểm tra.', tone: 'ai' },
  rule: {
    label: 'Bộ lọc gắn cờ',
    hint: 'Nội dung khớp luật lọc tự động; cần kiểm tra ngữ cảnh.',
    tone: 'rule',
  },
  new_content: {
    label: 'Nội dung mới',
    hint: 'Hồ sơ được tạo từ luồng kiểm tra nội dung mới.',
    tone: 'neutral',
  },
};

export function CaseContextTags({ item, visibility }: { item: ModerationCaseDto; visibility?: string }) {
  const sources = new Set(item.sources);
  if (item.reportCount > 0) sources.add('report');
  const pending = item.status === 'pending';
  const hidden = visibility === 'hidden' || (visibility === 'pending' && pending && item.isAutoHidden);
  const removed = visibility === 'removed';
  return (
    <ul className={`${styles.tags} ${styles.context}`} aria-label="Nguồn và trạng thái kiểm duyệt">
      {Object.entries(sourceLabels)
        .filter(([code]) => sources.has(code))
        .map(([code, source]) => (
          <li key={code} className={`${styles.tag} ${styles[source.tone]}`} title={source.hint}>
            {source.label}
          </li>
        ))}
      {(!sources.size || [...sources].some((source) => !(source in sourceLabels))) && (
        <li className={`${styles.tag} ${styles.neutral}`}>Nguồn chưa xác định</li>
      )}
      {pending && (
        <li
          className={`${styles.tag} ${styles.pending}`}
          title="Hồ sơ chưa được nhân sự kiểm duyệt kết luận."
        >
          Chờ xác minh
        </li>
      )}
      {removed ? (
        <li className={`${styles.tag} ${styles.critical}`}>Đã gỡ</li>
      ) : hidden ? (
        <li className={`${styles.tag} ${styles.high}`}>
          {pending && item.isAutoHidden ? 'Tự động ẩn · Chờ duyệt' : 'Đang ẩn'}
        </li>
      ) : (
        !pending && (
          <li className={`${styles.tag} ${styles.low}`}>
            {item.resolution === 'restore' ? 'Đã khôi phục' : 'Đã duyệt'}
          </li>
        )
      )}
    </ul>
  );
}
