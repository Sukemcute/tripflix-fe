import { t, vi } from '@tripflix/i18n';

const copy = vi.aiUsage;
const VN = 'Asia/Ho_Chi_Minh';

export type AiBucket = 'hour' | 'day';
/** Hôm nay vẽ theo giờ, các khoảng dài hơn theo ngày (API cho bucket giờ tối đa 8 ngày). */
export const bucketFor = (days: number): AiBucket => (days <= 1 ? 'hour' : 'day');

export const count = new Intl.NumberFormat('vi-VN');
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: VN });
// Ghép từ các phần riêng để dấu phân cách không phụ thuộc phiên bản ICU của trình duyệt hay Node (có nơi ra 18/11, nơi ra 18-11).
const hourParts = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: VN,
});
const dayParts = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: VN });
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((item) => item.type === type)?.value ?? '';

export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');
export function formatBucketLabel(iso: string, bucket: AiBucket): string {
  const at = new Date(iso);
  if (bucket === 'hour') {
    const parts = hourParts.formatToParts(at);
    return `${part(parts, 'hour')}:${part(parts, 'minute')}`;
  }
  const parts = dayParts.formatToParts(at);
  return `${part(parts, 'day')}/${part(parts, 'month')}`;
}

/** Thời gian xử lý: dưới 1 giây hiện mili giây, trên đó hiện giây; thiếu thì dấu gạch. */
export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000
    ? t('aiUsage.latency.ms', { value: Math.round(ms) })
    : t('aiUsage.latency.seconds', { value: (ms / 1000).toFixed(1).replace('.', ',') });
}

export const ANSWER_KINDS = Object.keys(copy.traceBoard.answerKinds).filter((kind) => kind !== 'all');

/** Tên kết quả cho người đọc; giá trị lạ (ai-service thêm sau) giữ nguyên. */
export function answerKindLabel(kind: string | null): string {
  if (kind === null) return '—';
  const labels = copy.traceBoard.answerKinds as Record<string, string>;
  return labels[kind] ?? kind;
}

export function stepLabel(step: string | null): string {
  if (step === null) return '—';
  const labels = copy.traceDetail.stepNames as Record<string, string>;
  return labels[step] ?? step;
}

export interface WaterfallStep {
  id: string;
  occurredAt: string;
  latencyMs: number | null;
}

export interface WaterfallRow {
  id: string;
  /** Vị trí bắt đầu, % của cả lượt. */
  offsetPct: number;
  /** Độ dài, % của cả lượt; tối thiểu 1% để bước rất ngắn vẫn thấy. */
  widthPct: number;
}

/**
 * Dòng thời gian của một lượt chat. Sự kiện được ghi lúc xong, nên một bước bắt đầu ở `occurredAt - latencyMs`
 * và cả lượt bắt đầu ở `occurredAt - latencyMs` của sự kiện lượt. Thiếu latencyMs thì bước coi như tức thời.
 */
export function buildWaterfall(
  turn: { occurredAt: string; latencyMs: number | null },
  steps: readonly WaterfallStep[],
): { totalMs: number; rows: WaterfallRow[] } {
  const turnEnd = Date.parse(turn.occurredAt);
  const spans = steps.map((step) => {
    const end = Date.parse(step.occurredAt);
    return { id: step.id, start: end - (step.latencyMs ?? 0), end };
  });
  const start = Math.min(
    turn.latencyMs === null ? turnEnd : turnEnd - turn.latencyMs,
    ...spans.map((span) => span.start),
  );
  const end = Math.max(turnEnd, ...spans.map((span) => span.end));
  const totalMs = Math.max(end - start, 1);
  const rows = spans.map((span) => {
    const offsetPct = Math.min(99, Math.max(0, ((span.start - start) / totalMs) * 100));
    const widthPct = Math.min(100 - offsetPct, Math.max(1, ((span.end - span.start) / totalMs) * 100));
    return { id: span.id, offsetPct, widthPct };
  });
  return { totalMs, rows };
}
