import { describe, expect, it } from 'vitest';
import { aiUsageRange, formatUsd } from './ai-usage-range';

describe('aiUsageRange', () => {
  it('tính ngày theo giờ Việt Nam, gồm cả hôm nay', () => {
    // 18:30 UTC ngày 16 là 01:30 ngày 17 ở Việt Nam.
    const now = Date.parse('2026-11-16T18:30:00Z');
    expect(aiUsageRange(7, now)).toEqual({ from: '2026-11-11', to: '2026-11-17' });
    expect(aiUsageRange(30, now)).toEqual({ from: '2026-10-19', to: '2026-11-17' });
  });
});

describe('formatUsd', () => {
  it('giữ 4 chữ số thập phân cho chi phí nhỏ', () => {
    expect(formatUsd(0.000092)).toBe('$0.0001');
    expect(formatUsd(1.5)).toBe('$1.5000');
  });
});
