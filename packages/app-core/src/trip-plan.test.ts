import { describe, expect, it } from 'vitest';
import {
  applyTripPlanChoices,
  buildTripAttachment,
  buildTripPlanCheckout,
  EMPTY_TRIP_PLAN_DAY,
  getBookableTripPlan,
  getTripDayDate,
  getTripNights,
  hasTripPlan,
  pickCheapestOffer,
} from './trip-plan';

describe('trip plan', () => {
  it('dựng trip_attachment từ bản nháp: phương tiện thành mục đầu ngày, bỏ dòng trống', () => {
    const labels = {
      flight: 'Máy bay',
      bus: 'Xe khách',
      train: 'Tàu hoả',
      car: 'Ô tô',
      other: 'Khác',
    } as const;
    expect(
      buildTripAttachment(
        {
          destinationName: ' Đà Lạt ',
          hotel: { hotelId: 'h1', hotelName: 'Ana Mandara' },
          days: [
            {
              activities: [
                { title: 'Hồ Xuân Hương', location: 'Trung tâm' },
                { title: '  ', location: '' },
              ],
              transport: { mode: 'flight', fromCode: 'SGN', toCode: 'DLI', note: '' },
            },
            {
              ...EMPTY_TRIP_PLAN_DAY,
              transport: { mode: 'bus', fromCode: '', toCode: '', note: 'Nhà xe Phương Trang' },
            },
          ],
        },
        labels,
      ),
    ).toEqual({
      daysCount: 2,
      destinationName: 'Đà Lạt',
      hotelId: 'h1',
      hotelName: 'Ana Mandara',
      items: [
        { day: 1, title: 'Máy bay SGN → DLI', transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } },
        { day: 1, title: 'Hồ Xuân Hương', location: 'Trung tâm' },
        { day: 2, title: 'Xe khách', notes: 'Nhà xe Phương Trang', transport: { mode: 'bus' } },
      ],
    });
    expect(
      buildTripAttachment({ destinationName: '', hotel: null, days: [EMPTY_TRIP_PLAN_DAY] }, labels),
    ).toBeNull();
  });

  it('chỉ cho đặt combo có chỗ ở và đủ tuyến bay cho các chặng phương tiện đã chọn', () => {
    const flight = { day: 1, transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } } as const;
    const hotelId = 'hotel-01';
    expect(getBookableTripPlan({ hotelId, items: [{ day: 1 }] })).toBeNull();
    expect(getBookableTripPlan({ items: [flight] })).toBeNull();
    expect(getBookableTripPlan({ hotelId, items: [{ day: 1, transport: { mode: 'flight' } }] })).toBeNull();
    expect(getBookableTripPlan({ hotelId, items: [flight, { day: 2, transport: { mode: 'bus' } }] })).toBeNull();
    expect(getBookableTripPlan({ hotelId, items: [flight, { day: 2 }] })).toEqual({
      hotelId,
      flights: [{ day: 1, from: 'SGN', to: 'DLI' }],
    });
  });

  it('ở tới sáng ngày cuối, ít nhất một đêm', () => {
    expect(getTripNights(1)).toBe(1);
    expect(getTripNights(3)).toBe(2);
  });

  it('chỉ coi là có lộ trình khi có lịch từng ngày hoặc chỗ ở', () => {
    expect(hasTripPlan(null)).toBe(false);
    expect(hasTripPlan({})).toBe(false);
    expect(hasTripPlan({ items: [], hotelId: null })).toBe(false);
    expect(hasTripPlan({ items: [{ day: 1 }] })).toBe(true);
    expect(hasTripPlan({ hotelId: 'h' })).toBe(true);
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
    expect(
      pickCheapestOffer([{ productId: 'x', isAvailable: true, plans: [{ code: 'RO', totalPrice: null }] }]),
    ).toBeNull();
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
    expect(
      buildTripPlanCheckout({ adults: 2, children: 1, sourcePostId: 'post', flights: [], rooms }),
    ).not.toHaveProperty('children');
    expect(() =>
      buildTripPlanCheckout({ adults: 1, sourcePostId: 'post', flights: [], rooms: [] }),
    ).toThrow();
  });

  it('đổi sân bay nhà ở cả chiều đi lẫn chiều về và đổi khách sạn', () => {
    const plan = {
      hotelId: 'h1',
      flights: [
        { day: 1, from: 'SGN', to: 'CXR' },
        { day: 4, from: 'CXR', to: 'SGN' },
      ],
    };
    expect(applyTripPlanChoices(plan, { homeAirport: 'HAN', hotelId: 'h2' })).toEqual({
      hotelId: 'h2',
      flights: [
        { day: 1, from: 'HAN', to: 'CXR' },
        { day: 4, from: 'CXR', to: 'HAN' },
      ],
    });
    expect(applyTripPlanChoices(plan, {})).toEqual(plan);
  });
});

