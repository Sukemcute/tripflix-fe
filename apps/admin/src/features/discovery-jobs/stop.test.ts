import { describe, expect, it } from 'vitest';
import { toStopReason } from './stop';

describe('toStopReason', () => {
  it('bỏ khoảng trắng hai đầu, nhận 3–300 ký tự', () => {
    expect(toStopReason('  Điểm ra sai  ')).toBe('Điểm ra sai');
    expect(toStopReason('abc')).toBe('abc');
    expect(toStopReason('x'.repeat(300))).toHaveLength(300);
  });

  it('từ chối rỗng, quá ngắn hoặc quá dài', () => {
    expect(toStopReason('')).toBeNull();
    expect(toStopReason('  ab  ')).toBeNull();
    expect(toStopReason('x'.repeat(301))).toBeNull();
  });
});
