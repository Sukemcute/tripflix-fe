import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { Badge, type Tone } from '../ui/primitives';
import { getContentWarning, getRiskLevel, getVisobertScore } from './risk-level';

const sourceLabels: Record<string, { label: string; hint: string; tone: Tone }> = {
  report: {
    label: 'Người dùng báo cáo',
    hint: 'Có báo cáo từ người dùng; chưa phải kết luận vi phạm.',
    tone: 'coral',
  },
  ai: { label: 'AI gắn cờ', hint: 'Mô hình AI phát hiện dấu hiệu cần kiểm tra.', tone: 'navy' },
  rule: {
    label: 'Bộ lọc gắn cờ',
    hint: 'Nội dung khớp luật lọc tự động; cần kiểm tra ngữ cảnh.',
    tone: 'sun',
  },
  new_content: {
    label: 'Nội dung mới',
    hint: 'Hồ sơ được tạo từ luồng kiểm tra nội dung mới.',
    tone: 'neutral',
  },
};

export const RISK_TONE: Record<ReturnType<typeof getRiskLevel>['tone'], Tone> = {
  critical: 'danger',
  high: 'coral',
  medium: 'sun',
  low: 'teal',
};

export function CaseContextTags({ item, visibility }: { item: ModerationCaseDto; visibility?: string }) {
  const sources = new Set(item.sources);
  if (item.reportCount > 0) sources.add('report');
  const pending = item.status === 'pending';
  const hidden = visibility === 'hidden' || (visibility === 'pending' && pending && item.isAutoHidden);
  const removed = visibility === 'removed';
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Nguồn và trạng thái kiểm duyệt">
      {Object.entries(sourceLabels)
        .filter(([code]) => sources.has(code))
        .map(([code, source]) => (
          <li key={code}>
            <Badge tone={source.tone} title={source.hint}>
              {source.label}
            </Badge>
          </li>
        ))}
      {(!sources.size || [...sources].some((source) => !(source in sourceLabels))) && (
        <li>
          <Badge>Nguồn chưa xác định</Badge>
        </li>
      )}
      {pending && (
        <li>
          <Badge tone="sun" hasDot title="Hồ sơ chưa được nhân sự kiểm duyệt kết luận.">
            Chờ xác minh
          </Badge>
        </li>
      )}
      {visibility === 'held' && (
        <li>
          <Badge tone="sun">{vi.api.moderationHeld}</Badge>
        </li>
      )}
      {removed ? (
        <li>
          <Badge tone="danger">Đã gỡ</Badge>
        </li>
      ) : hidden ? (
        <li>
          <Badge tone="coral">{pending && item.isAutoHidden ? 'Tự động ẩn · Chờ duyệt' : 'Đang ẩn'}</Badge>
        </li>
      ) : (
        !pending && (
          <li>
            <Badge tone="teal">{item.resolution === 'restore' ? 'Đã khôi phục' : 'Đã duyệt'}</Badge>
          </li>
        )
      )}
    </ul>
  );
}

export function RiskTags({ item }: { item: ModerationCaseDto }) {
  const level = getRiskLevel(item.severity);
  const warning = getContentWarning(item.flags);
  const score = getVisobertScore(item.flags);
  return (
    <div className="flex flex-wrap gap-1.5">
      {warning ? (
        <Badge
          tone={RISK_TONE[warning.tone]}
          title="Dấu hiệu từ luật lọc tại lần đánh giá được lưu. Cần xem ngữ cảnh khi ra quyết định."
        >
          {warning.label}
        </Badge>
      ) : item.severity >= 50 ? (
        <Badge tone={RISK_TONE[level.tone]}>Ưu tiên {level.label.toLowerCase()}</Badge>
      ) : (
        <Badge tone="sun">Cần xem xét</Badge>
      )}
      {score !== null && (
        <Badge
          tone="navy"
          className="font-mono"
          title="Score toxic của ViSoBERT tại lần đánh giá được lưu. Ngưỡng gắn cờ mặc định 0,97. Đây là score mô hình, chưa phải xác suất vi phạm đã hiệu chỉnh."
        >
          ViSoBERT {score.toFixed(4)}
        </Badge>
      )}
      {item.flags.aiUnavailable === true && (
        <Badge
          tone="sun"
          title="Core không nhận được verdict AI hợp lệ ở lần đánh giá được lưu. Đây là trạng thái lịch sử của hồ sơ, cần đối chiếu log để biết nguyên nhân và trạng thái hiện tại."
        >
          Chưa có kết quả AI ở lần đánh giá này
        </Badge>
      )}
    </div>
  );
}

/** Thanh điểm ưu tiên 0–100: nhìn nhanh mức rủi ro trong bảng. */
export function SeverityMeter({ severity, isWarning = false }: { severity: number; isWarning?: boolean }) {
  const level = getRiskLevel(isWarning ? Math.max(50, severity) : severity);
  const tone = RISK_TONE[level.tone];
  const barClass = {
    danger: 'bg-danger',
    coral: 'bg-coral',
    sun: 'bg-sun',
    teal: 'bg-teal',
    neutral: 'bg-text-subtle',
    navy: 'bg-navy',
  }[tone];
  return (
    <span className="flex min-w-24 items-center gap-2" title={`${level.label} · ${severity}/100`}>
      <strong className="w-7 text-right text-sm font-bold tabular-nums">{severity}</strong>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, severity)}%` }} />
      </span>
    </span>
  );
}
