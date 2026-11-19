import { vi } from '@tripflix/i18n';
import type { AnomalyKind, OrderStatus } from './orders-types';

export function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export function getStatusLabel(status: string): string {
  return vi.adminOrders.status[status as OrderStatus] ?? status;
}

/** Tóm tắt detail của một bất thường thành một dòng cho người vận hành; khoá không biết thì bỏ qua. */
export function summarizeAnomaly(kind: AnomalyKind, detail: Record<string, unknown>): string {
  const money = (key: string) => (typeof detail[key] === 'number' ? formatMoney(detail[key]) : null);
  const parts: (string | null)[] = [];
  if (kind === 'double_charge')
    parts.push(`${String(detail['charges'] ?? '?')} khoản`, money('chargedAmount'));
  if (kind === 'charged_without_seat')
    parts.push(money('chargedAmount'), detail['unrefunded'] ? `chưa hoàn ${money('unrefunded')}` : null);
  if (kind === 'paid_without_seat') {
    const cells = Array.isArray(detail['shortCells']) ? (detail['shortCells'] as { date: string }[]) : [];
    if (cells.length) parts.push(`thiếu chỗ ${cells.map((c) => c.date).join(', ')}`);
    if (Number(detail['itemsWithoutCode']))
      parts.push(`${String(detail['itemsWithoutCode'])} mục chưa có mã`);
  }
  if (kind === 'paid_amount_mismatch') parts.push(`đã trừ ${money('chargedAmount') ?? '0đ'}`);
  if (kind === 'stuck_payment')
    parts.push(
      detail['needsReview'] ? vi.adminOrders.needsReview : null,
      `đã hỏi cổng ${String(detail['checkAttempts'] ?? 0)} lần`,
    );
  if (kind === 'refund_needs_review') parts.push(money('amount'));
  return parts.filter(Boolean).join(' · ');
}
