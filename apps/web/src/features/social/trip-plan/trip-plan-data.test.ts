import type { TripItineraryItemDto } from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it } from 'vitest';
import { buildPlaceMapUrl, formatTransportRoute, getTripDayCount, groupTripDays } from './trip-plan-data';

const item = (day: number, title: string, time?: string): TripItineraryItemDto => ({ day, title, ...(time ? { time } : {}) });

describe('lịch trình theo ngày', () => {
  it('nhóm theo ngày tăng dần, trong ngày sắp theo giờ', () => {
    const days = groupTripDays({
      items: [item(2, 'Tour đảo', '09:00'), item(1, 'Ăn tối', '19:00'), item(1, 'Bay vào', '08:00'), item(2, 'Tắm bùn', '07:30')],
    });
    expect(days.map((d) => [d.day, d.items.map((i) => i.title)])).toEqual([
      [1, ['Bay vào', 'Ăn tối']],
      [2, ['Tắm bùn', 'Tour đảo']],
    ]);
  });

  it('điểm không có giờ giữ thứ tự tác giả nhập, đứng sau điểm có giờ', () => {
    const [day] = groupTripDays({ items: [item(1, 'Dạo phố'), item(1, 'Chợ đêm'), item(1, 'Check-in', '14:00')] });
    expect(day!.items.map((i) => i.title)).toEqual(['Check-in', 'Dạo phố', 'Chợ đêm']);
  });

  it('bỏ ngày không hợp lệ, không có lịch trình thì rỗng', () => {
    expect(groupTripDays({ items: [item(0, 'Sai'), item(1, 'Đúng')] }).map((d) => d.day)).toEqual([1]);
    expect(groupTripDays(null)).toEqual([]);
  });

  it('số ngày lấy số lớn hơn giữa khai báo và ngày cuối có điểm dừng', () => {
    expect(getTripDayCount({ daysCount: 3, items: [item(4, 'x')] })).toBe(4);
    expect(getTripDayCount({ daysCount: 5, items: [item(2, 'x')] })).toBe(5);
    expect(getTripDayCount(undefined)).toBe(0);
  });
});

describe('link bản đồ', () => {
  it('có toạ độ thì theo toạ độ', () => {
    expect(buildPlaceMapUrl({ name: 'Vinpearl', lat: 12.2, lng: 109.25 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=12.2,109.25',
    );
  });

  it('không có toạ độ thì tìm theo tên kèm điểm đến (không lặp nếu tên đã có điểm đến)', () => {
    expect(buildPlaceMapUrl({ name: 'Chợ Đầm', destination: 'Nha Trang' })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Chợ Đầm, Nha Trang')}`,
    );
    expect(buildPlaceMapUrl({ name: 'Vịnh Nha Trang', destination: 'Nha Trang' })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Vịnh Nha Trang')}`,
    );
    expect(buildPlaceMapUrl({ name: '  ' })).toBeNull();
  });
});

describe('chặng di chuyển', () => {
  it('chặng bay hiện mã sân bay đi → đến', () => {
    expect(formatTransportRoute({ mode: 'flight', fromAirport: 'HAN', toAirport: 'CXR' })).toBe('HAN → CXR');
    expect(formatTransportRoute({ mode: 'bus' })).toBeNull();
    expect(formatTransportRoute(undefined)).toBeNull();
  });
});
