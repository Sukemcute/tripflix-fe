import { describe, expect, it } from 'vitest';
import { buildAssistantTripSelection, isAssistantPlanId } from './assistant-trip-plan';
import { parseTripPlanSelection } from './trip-plan-selection';

const card = {
  ref: 'c1',
  title: 'Đà Lạt 3 ngày',
  lines: [
    { label: 'Ngày 1 · Sáng', detail: 'Cà phê Tùng · Khu Hòa Bình' },
    { label: 'Ngày 2 · Chiều', detail: 'Đồi chè Cầu Đất' },
  ],
};
const options = { authorName: 'Tripi', today: '2026-11-18' };

describe('buildAssistantTripSelection', () => {
  it('chuyển kế hoạch Tripi thành lộ trình đặt có khách sạn, chuyến bay và điểm từng ngày', () => {
    const selection = buildAssistantTripSelection(
      card,
      {
        destination: 'Đà Lạt',
        days: '3',
        hotelId: 'h1',
        hotelName: 'Ana Mandara',
        checkIn: '2026-12-01',
        nights: '2',
        flightFrom: 'SGN',
        flightTo: 'DLI',
        flightDate: '2026-12-01',
      },
      options,
    );
    expect(selection).toMatchObject({
      postId: 'tripi:c1',
      postTitle: 'Đà Lạt 3 ngày',
      authorName: 'Tripi',
      trip: { destinationName: 'Đà Lạt', hotelId: 'h1', hotelName: 'Ana Mandara', daysCount: 3 },
    });
    expect(selection?.trip.items).toEqual([
      { day: 1, title: 'SGN → DLI', transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } },
      { day: 1, title: 'Cà phê Tùng', location: 'Khu Hòa Bình', notes: 'Sáng' },
      { day: 2, title: 'Đồi chè Cầu Đất', notes: 'Chiều' },
    ]);
    // Lưu được vào kho lộ trình đang đặt như lộ trình của reel.
    expect(parseTripPlanSelection(JSON.stringify(selection))).toEqual(selection);
    expect(isAssistantPlanId(selection!.postId)).toBe(true);
    expect(isAssistantPlanId('post-1')).toBe(false);
  });

  it('bỏ dòng bay, nhận trả phòng khỏi gợi ý và thêm chuyến bay về ở ngày cuối', () => {
    const selection = buildAssistantTripSelection(
      {
        ...card,
        lines: [
          { service: 'flight', label: 'Ngày 1 · ✈ Bay HAN → DLI 13:00–14:40', detail: 'Bay' },
          { service: 'stay', label: 'Ngày 1 · Nhận phòng D. House', detail: '05/12' },
          { service: null, label: 'Ngày 1 · chiều', detail: 'Chùa Tàu' },
          { service: 'flight', label: 'Ngày 3 · ✈ Bay DLI → HAN', detail: 'Bay về' },
        ],
      },
      {
        days: '3',
        flightFrom: 'HAN',
        flightTo: 'DLI',
        flightDate: '2026-12-05',
        returnFrom: 'DLI',
        returnTo: 'HAN',
      },
      options,
    );
    expect(selection?.trip.items).toEqual([
      { day: 1, title: 'HAN → DLI', transport: { mode: 'flight', fromAirport: 'HAN', toAirport: 'DLI' } },
      { day: 1, title: 'Chùa Tàu', notes: 'chiều' },
      { day: 3, title: 'DLI → HAN', transport: { mode: 'flight', fromAirport: 'DLI', toAirport: 'HAN' } },
    ]);
  });

  it('không có điểm nào và không có khách sạn thì không tạo lộ trình', () => {
    expect(buildAssistantTripSelection({ ...card, lines: [] }, {}, options)).toBeNull();
  });
});
