import { describe, expect, it } from 'vitest';
import { formatInterval, toIntervalMs } from './interval';

describe('toIntervalMs', () => {
  it('đổi phút hợp lệ sang ms', () => {
    expect(toIntervalMs(1)).toBe(60_000);
    expect(toIntervalMs(1440)).toBe(86_400_000);
  });

  it('từ chối ngoài giới hạn hoặc không nguyên', () => {
    expect(toIntervalMs(0)).toBeNull();
    expect(toIntervalMs(1441)).toBeNull();
    expect(toIntervalMs(2.5)).toBeNull();
    expect(toIntervalMs(Number.NaN)).toBeNull();
  });
});

describe('formatInterval', () => {
  it('hiện giờ khi chẵn giờ, còn lại hiện phút', () => {
    expect(formatInterval(21_600_000)).toBe('6 giờ');
    expect(formatInterval(5_400_000)).toBe('90 phút');
    expect(formatInterval(600_000)).toBe('10 phút');
  });
});
