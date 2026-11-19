import { describe, expect, it } from 'vitest';
import { countFailedRuns, formatErrorRate, sumAnomalies } from './system-summary-format';

describe('sumAnomalies', () => {
  it('cộng số của mọi loại, bỏ qua loại không có', () => {
    expect(sumAnomalies({ stuck_payment: 2, double_charge: 3, refund_needs_review: undefined })).toBe(5);
  });

  it('chưa tải xong thì chưa có số', () => {
    expect(sumAnomalies(undefined)).toBeUndefined();
    expect(sumAnomalies({})).toBe(0);
  });
});

describe('countFailedRuns', () => {
  const group = (...outcomes: string[]) => ({ jobs: [{ runs: outcomes.map((outcome) => ({ outcome })) }] });

  it('đếm lượt lỗi của cả hai nhóm job', () => {
    expect(countFailedRuns([group('failed', 'succeeded'), group('failed', 'failed')])).toBe(3);
  });

  it('một nhóm chưa tải xong thì chưa có số, tránh hiện thiếu', () => {
    expect(countFailedRuns([group('failed'), undefined])).toBeUndefined();
  });
});

describe('formatErrorRate', () => {
  it('đổi phần sang phần trăm, tối đa 2 số lẻ', () => {
    expect(formatErrorRate(0.01234)).toBe('1,23%');
    expect(formatErrorRate(0)).toBe('0%');
  });

  it('chưa tải thì undefined, chưa có số liệu thì gạch ngang', () => {
    expect(formatErrorRate(undefined)).toBeUndefined();
    expect(formatErrorRate(null)).toBe('—');
  });
});
