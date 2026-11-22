import { describe, expect, it } from 'vitest';
import { getNextWeekendDates } from './weekend-dates';

describe('getNextWeekendDates', () => {
  it.each([
    ['2026-11-18', '2026-11-21', '2026-11-22'], // thứ Tư
    ['2026-11-21', '2026-11-21', '2026-11-22'], // thứ Bảy: lấy luôn hôm nay
    ['2026-11-22', '2026-11-28', '2026-11-29'], // Chủ nhật: sang tuần sau
    ['2026-12-31', '2027-01-02', '2027-01-03'], // qua năm mới
  ])('%s → %s đến %s', (today, checkIn, checkOut) => {
    expect(getNextWeekendDates(today)).toEqual({ checkIn, checkOut });
  });
});
