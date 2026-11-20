import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import { getContentWarning, getRiskLevel, getVisobertScore } from './risk-level';
import riskStyles from './risk-level.module.css';

/** Các dấu hiệu rủi ro của hồ sơ (luật lọc, ViSoBERT, AI chưa khả dụng). Nội dung chữ giữ nguyên từ bản cũ. */
export function RiskTags({ item }: { item: ModerationCaseDto }) {
  const level = getRiskLevel(item.severity);
  const warning = getContentWarning(item.flags);
  const score = getVisobertScore(item.flags);
  return (
    <div className={riskStyles.tags}>
      {warning ? (
        <span
          className={`${riskStyles.tag} ${riskStyles[warning.tone]}`}
          title="Dấu hiệu từ luật lọc tại lần đánh giá được lưu. Cần xem ngữ cảnh khi ra quyết định."
        >
          {warning.label}
        </span>
      ) : item.severity >= 50 ? (
        <span className={`${riskStyles.tag} ${riskStyles[level.tone]}`}>
          Ưu tiên {level.label.toLowerCase()}
        </span>
      ) : (
        <span className={`${riskStyles.tag} ${riskStyles.medium}`}>Cần xem xét</span>
      )}
      {score !== null && (
        <span
          className={`${riskStyles.tag} ${riskStyles.evidence}`}
          title="Score toxic của ViSoBERT tại lần đánh giá được lưu. Ngưỡng gắn cờ mặc định 0,97. Đây là score mô hình, chưa phải xác suất vi phạm đã hiệu chỉnh."
        >
          ViSoBERT {score.toFixed(4)}
        </span>
      )}
      {item.flags.aiUnavailable === true && (
        <span
          className={`${riskStyles.tag} ${riskStyles.medium}`}
          title="Core không nhận được verdict AI hợp lệ ở lần đánh giá được lưu. Đây là trạng thái lịch sử của hồ sơ, cần đối chiếu log để biết nguyên nhân và trạng thái hiện tại."
        >
          Chưa có kết quả AI ở lần đánh giá này
        </span>
      )}
    </div>
  );
}
