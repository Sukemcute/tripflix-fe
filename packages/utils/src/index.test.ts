import { describe, expect, it } from 'vitest';
import { compactCount, formatDate, formatDuration, formatVnd } from './index';

describe('utils', () => {
  it('formatVnd', () => {
    expect(formatVnd(1250000)).toBe('1.250.000 ₫');
  });

  it('compactCount', () => {
    expect(compactCount(950)).toBe('950');
    expect(compactCount(1200)).toBe('1,2K');
    expect(compactCount(3_400_000)).toBe('3,4M');
  });

  it('formatDate theo giờ Việt Nam', () => {
    expect(formatDate('2026-11-03T18:00:00Z')).toBe('04/11/2026');
  });

  it('formatDuration', () => {
    expect(formatDuration(1799)).toBe('29:59');
    expect(formatDuration(-5)).toBe('00:00');
  });
});
