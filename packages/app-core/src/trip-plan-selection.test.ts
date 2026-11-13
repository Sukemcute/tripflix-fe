import { describe, expect, it } from 'vitest';
import { parseTripPlanSelection } from './trip-plan-selection';

const selected = {
  postId: 'post-1',
  postTitle: 'Đà Lạt cuối tuần',
  authorName: 'Linh',
  trip: {
    hotelId: 'hotel-1',
    hotelName: 'Chỗ ở',
    destinationName: 'Đà Lạt',
    daysCount: 3,
    items: [
      { day: 1, title: 'Bay đi', transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } },
      { day: 2, title: 'Dạo hồ', location: 'Xuân Hương', notes: 'Buổi sáng' },
    ],
  },
};
describe('parseTripPlanSelection', () => {
  it('khôi phục ảnh bìa và vẫn đọc lựa chọn cũ chưa có ảnh', () => {
    const withCover = { ...selected, coverUrl: 'https://example.com/poster.jpg' };
    expect(parseTripPlanSelection(JSON.stringify(withCover))).toEqual(withCover);
    expect(parseTripPlanSelection(JSON.stringify(selected))).toEqual(selected);
  });
  it.each([null, 42, true, {}, []])('bỏ ảnh bìa sai kiểu: %s', (coverUrl) => {
    expect(parseTripPlanSelection(JSON.stringify({ ...selected, coverUrl }))).toBeNull();
  });
  it('giữ thông tin bài và lịch trình để khôi phục lựa chọn', () => {
    expect(parseTripPlanSelection(JSON.stringify(selected))).toEqual(selected);
    const flightOnly = { ...selected, trip: { items: [selected.trip.items[0]] } };
    expect(parseTripPlanSelection(JSON.stringify(flightOnly))).toEqual(flightOnly);
  });
  it.each([null, '', '{', 'null', '[]', '{}'])('bỏ dữ liệu trống/hỏng: %s', (raw) => {
    expect(parseTripPlanSelection(raw)).toBeNull();
  });
  it.each([
    { ...selected, postId: 1 },
    { ...selected, authorName: null },
    { ...selected, trip: {} },
    { ...selected, trip: { hotelId: 1 } },
    { ...selected, trip: { hotelId: 'h', daysCount: 31 } },
    { ...selected, trip: { hotelId: 'h', items: {} } },
    { ...selected, trip: { hotelId: 'h', items: [null] } },
    { ...selected, trip: { hotelId: 'h', items: [{ day: 0, title: 'Sai' }] } },
    { ...selected, trip: { hotelId: 'h', items: [{ day: 1, title: 'Sai', transport: { mode: 'boat' } }] } },
  ])('bỏ cấu trúc không hợp lệ trước khi đưa lên UI', (value) => {
    expect(parseTripPlanSelection(JSON.stringify(value))).toBeNull();
  });
});
