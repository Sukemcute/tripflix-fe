import { describe, expect, it } from 'vitest';
import { getFlightDurationMinutes, pickFlightHighlights, sortFlightGroups } from './flight-sort';

const offer = (
  departTime: string,
  arriveTime: string,
  priceFrom: number | null,
  durationMinutes?: number,
) => ({
  departTime,
  arriveTime,
  durationMinutes: durationMinutes ?? null,
  priceFrom,
  isAvailable: priceFrom !== null,
});
const early = [offer('06:00', '08:30', 2_000_000)];
const cheap = [offer('09:00', '11:00', 1_500_000), offer('09:00', '11:00', 3_000_000)];
const late = [offer('22:30', '00:15', 1_800_000)];
const soldOut = [offer('05:00', '06:00', null)];

describe('getFlightDurationMinutes', () => {
  it('ưu tiên số phút BE trả, thiếu thì tính từ giờ, qua nửa đêm cộng một ngày', () => {
    expect(getFlightDurationMinutes(offer('09:00', '11:00', 1, 125))).toBe(125);
    expect(getFlightDurationMinutes(offer('22:30', '00:15', 1))).toBe(105);
    expect(getFlightDurationMinutes({ departTime: null, arriveTime: '10:00' })).toBeNull();
  });
});

describe('sortFlightGroups', () => {
  const groups = [early, soldOut, cheap, late];
  it('đề xuất giữ thứ tự BE trả', () => {
    expect(sortFlightGroups(groups, 'recommended')).toEqual(groups);
  });
  it('xếp theo giá, giờ đi, thời gian bay; chuyến hết chỗ luôn cuối', () => {
    expect(sortFlightGroups(groups, 'price')).toEqual([cheap, late, early, soldOut]);
    expect(sortFlightGroups(groups, 'departure')).toEqual([early, cheap, late, soldOut]);
    expect(sortFlightGroups(groups, 'duration')).toEqual([late, cheap, early, soldOut]);
  });
});

describe('pickFlightHighlights', () => {
  it('gắn nhãn chuyến rẻ nhất và nhanh nhất; bằng nhau thì không gắn', () => {
    expect(pickFlightHighlights([early, cheap, late])).toEqual({ cheapest: 1, fastest: 2 });
    expect(pickFlightHighlights([early, early])).toEqual({ cheapest: undefined, fastest: undefined });
  });
});
