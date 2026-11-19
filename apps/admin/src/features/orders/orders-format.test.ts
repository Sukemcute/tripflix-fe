import { describe, expect, it } from 'vitest';
import { formatMoney, getStatusLabel, summarizeAnomaly } from './orders-format';

describe('orders-format', () => {
  it('định dạng tiền và nhãn trạng thái', () => {
    expect(formatMoney(2_000_000)).toBe('2.000.000đ');
    expect(getStatusLabel('paid')).toBe('Đã trả');
    expect(getStatusLabel('la')).toBe('la');
  });

  it('tóm tắt từng loại bất thường', () => {
    expect(summarizeAnomaly('double_charge', { charges: 2, chargedAmount: 4_000_000 })).toBe(
      '2 khoản · 4.000.000đ',
    );
    expect(summarizeAnomaly('charged_without_seat', { chargedAmount: 1_000, unrefunded: 1_000 })).toBe(
      '1.000đ · chưa hoàn 1.000đ',
    );
    expect(
      summarizeAnomaly('paid_without_seat', { shortCells: [{ date: '2026-12-10' }], itemsWithoutCode: 1 }),
    ).toBe('thiếu chỗ 2026-12-10 · 1 mục chưa có mã');
    expect(summarizeAnomaly('paid_amount_mismatch', { chargedAmount: 0 })).toBe('đã trừ 0đ');
    expect(summarizeAnomaly('stuck_payment', { needsReview: true, checkAttempts: 5 })).toBe(
      'Cần người xử lý · đã hỏi cổng 5 lần',
    );
    expect(summarizeAnomaly('refund_needs_review', {})).toBe('');
  });
});
