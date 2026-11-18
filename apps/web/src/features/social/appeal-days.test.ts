import { describe, expect, it } from 'vitest';
import { getAppealDaysLeft } from './appeal-days';

describe('getAppealDaysLeft', () => {
  const createdAt = '2026-11-01T00:00:00.000Z';
  const start = Date.parse(createdAt);
  const day = 86_400_000;

  it('đếm ngược 30 ngày từ lúc ra quyết định', () => {
    expect(getAppealDaysLeft(createdAt, start)).toBe(30);
    expect(getAppealDaysLeft(createdAt, start + day)).toBe(29);
  });

  it('làm tròn lên và không xuống dưới 1 khi còn hạn', () => {
    expect(getAppealDaysLeft(createdAt, start + 29.5 * day)).toBe(1);
    expect(getAppealDaysLeft(createdAt, start + 30 * day)).toBe(1);
  });
});
