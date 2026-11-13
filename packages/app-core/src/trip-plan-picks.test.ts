import { describe, expect, it } from 'vitest';
import { applyTripPlanChoices, getBookableTripPlan, resolveTripPlanOffer } from './trip-plan';

const cheapest = { productId: 'room-a', ratePlanCode: 'basic', totalPrice: 100 };
const picked = { productId: 'room-b', ratePlanCode: 'flex', totalPrice: 200, roomName: 'Phòng đôi' };
const offers = [cheapest, picked];
const picks = { key: 'trip-date-party', values: { hotel: { ...picked, totalPrice: 150 } } };

describe('lựa chọn giá cho lộ trình', () => {
  it('dùng mã đã chọn nhưng lấy giá và mô tả hiện tại', () => {
    expect(resolveTripPlanOffer(offers, picks, picks.key, 'hotel')).toBe(picked);
  });
  it('bỏ lựa chọn của bộ lọc cũ', () => {
    expect(resolveTripPlanOffer(offers, picks, 'other-date-party', 'hotel')).toBe(cheapest);
  });
  it('đổi khách sạn thay kế hoạch và bỏ gói phòng của chỗ ở trước', () => {
    const basePlan = getBookableTripPlan({ hotelId: 'hotel-a', daysCount: 3 })!;
    const nextPlan = applyTripPlanChoices(basePlan, { hotelId: 'hotel-b' });
    const previousKey = JSON.stringify(['post-1', basePlan, '2026-12-01', '2026-12-03', { adults: 2 }]);
    const nextKey = JSON.stringify(['post-1', nextPlan, '2026-12-01', '2026-12-03', { adults: 2 }]);
    expect(nextPlan.hotelId).toBe('hotel-b');
    expect(basePlan.hotelId).toBe('hotel-a');
    expect(
      resolveTripPlanOffer(offers, { key: previousKey, values: { hotel: picked } }, nextKey, 'hotel'),
    ).toBe(cheapest);
  });
  it('không lấy lựa chọn của mục khác', () => {
    expect(resolveTripPlanOffer(offers, picks, picks.key, 'f0')).toBe(cheapest);
  });
  it('về giá rẻ nhất khi sản phẩm hoặc gói giá hết bán', () => {
    expect(resolveTripPlanOffer([cheapest], picks, picks.key, 'hotel')).toBe(cheapest);
    expect(
      resolveTripPlanOffer([cheapest, { ...picked, ratePlanCode: 'other' }], picks, picks.key, 'hotel'),
    ).toBe(cheapest);
  });
  it('không tạo lựa chọn khi hết mọi giá', () => {
    expect(resolveTripPlanOffer([], picks, picks.key, 'hotel')).toBeNull();
  });
});
