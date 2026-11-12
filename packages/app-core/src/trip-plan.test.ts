import { describe, expect, it } from 'vitest';
import { buildTripPlanCheckout, getTripDayDate, hasTripPlan, pickCheapestOffer } from './trip-plan';

describe('trip plan', () => {
  it('chỉ coi là có lộ trình khi có hoạt động, chặng đi hoặc chỗ ở', () => {
    expect(hasTripPlan(null)).toBe(false);
    expect(hasTripPlan({})).toBe(false);
    expect(hasTripPlan({ items: [], segments: [], stays: [] })).toBe(false);
    expect(hasTripPlan({ items: [{ day: 1 }] })).toBe(true);
    expect(hasTripPlan({ segments: [{ day: 1 }] })).toBe(true);
    expect(hasTripPlan({ stays: [{ hotelId: 'h' }] })).toBe(true);
  });

  it('tính ngày theo ngày khởi hành, qua tháng và năm', () => {
    expect(getTripDayDate('2026-12-30', 1)).toBe('2026-12-30');
    expect(getTripDayDate('2026-12-30', 3)).toBe('2027-01-01');
    expect(getTripDayDate('2027-02-28', 2)).toBe('2027-03-01');
  });

  it('chọn lựa chọn rẻ nhất còn bán, bỏ qua hết chỗ và giá trống', () => {
    expect(
      pickCheapestOffer([
        { productId: 'sold-out', isAvailable: false, plans: [{ code: 'RO', totalPrice: 100 }] },
        {
          productId: 'deluxe',
          isAvailable: true,
          plans: [
            { code: 'BB', totalPrice: 900 },
            { code: 'RO', totalPrice: null },
          ],
        },
        { productId: 'standard', isAvailable: true, plans: [{ code: 'RO', totalPrice: 700 }] },
      ]),
    ).toEqual({ productId: 'standard', ratePlanCode: 'RO', totalPrice: 700 });
    expect(pickCheapestOffer([{ productId: 'x', isAvailable: true, plans: [{ code: 'RO', totalPrice: null }] }])).toBeNull();
  });

  it('ghép vé bay và phòng vào một đơn, chỉ gửi trẻ em khi có vé bay', () => {
    const rooms = [{ productId: 'P1', ratePlanCode: 'BB', checkIn: '2026-12-01', checkOut: '2026-12-03' }];
    const flights = [{ productId: 'F1', ratePlanCode: 'ECO', date: '2026-12-01' }];
    expect(buildTripPlanCheckout({ adults: 2, children: 1, sourcePostId: 'post', flights, rooms })).toEqual({
      adults: 2,
      children: 1,
      sourcePostId: 'post',
      items: [
        { productId: 'F1', checkIn: '2026-12-01', ratePlanCode: 'ECO' },
        { productId: 'P1', checkIn: '2026-12-01', checkOut: '2026-12-03', ratePlanCode: 'BB' },
      ],
    });
    expect(buildTripPlanCheckout({ adults: 2, children: 1, sourcePostId: 'post', flights: [], rooms })).not.toHaveProperty(
      'children',
    );
    expect(() => buildTripPlanCheckout({ adults: 1, sourcePostId: 'post', flights: [], rooms: [] })).toThrow();
  });
});
