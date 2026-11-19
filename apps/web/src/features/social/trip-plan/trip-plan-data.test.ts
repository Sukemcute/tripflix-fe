import type { TripItineraryItemDto } from '@tripflix/api-client/core-api/model/index';
import { describe, expect, it } from 'vitest';
import {
  addStayStops,
  getTransportPrefixRoute,
  assignStopThumbnails,
  buildPlaceMapUrl,
  countTripStops,
  estimateStayCost,
  findFirstFlightRoute,
  formatTransportRoute,
  getAuthorShortName,
  getTripDayCount,
  groupTripDays,
  listFlightRoutes,
  pickSimilarTrips,
} from './trip-plan-data';

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

describe('số liệu nhanh của chuyến', () => {
  it('chặng bay đầu tiên và số điểm dừng không kể chặng di chuyển', () => {
    const trip = {
      items: [
        { day: 1, title: 'Bay vào', transport: { mode: 'flight' as const, fromAirport: 'HAN', toAirport: 'CXR' } },
        { day: 1, title: 'Check-in' },
        { day: 2, title: 'Tour đảo' },
      ],
    };
    expect(findFirstFlightRoute(trip)).toBe('HAN → CXR');
    expect(countTripStops(trip)).toBe(2);
    expect(findFirstFlightRoute({ items: [{ day: 1, title: 'Xe', transport: { mode: 'bus' as const } }] })).toBeNull();
  });

  it('chuyến tương tự: bỏ bài đang xem và bài không có lịch trình, giữ thứ tự, tối đa 3', () => {
    const withTrip = (id: string) => ({ id, tripAttachment: { items: [{ day: 1, title: 'x' }] } });
    const posts = [withTrip('a'), { id: 'b', tripAttachment: null }, withTrip('cur'), withTrip('c'), withTrip('d'), withTrip('e')];
    expect(pickSimilarTrips(posts, 'cur').map((post) => post.id)).toEqual(['a', 'c', 'd']);
  });

  it('tên ngắn của tác giả cho dòng mẹo', () => {
    expect(getAuthorShortName('Hoàng Nam Travel')).toBe('Nam');
    expect(getAuthorShortName('Bảo Ngọc')).toBe('Ngọc');
    expect(getAuthorShortName('Travel')).toBe('Travel');
    expect(getAuthorShortName(null)).toBeNull();
  });
});

describe('chi phí từng mục', () => {
  it('tiền phòng = giá từ × số đêm của từng chặng ở; chặng chưa có giá đếm vào missing', () => {
    const stays = [
      { hotelId: 'a', nights: 2 },
      { hotelId: 'b', nights: 1 },
      { hotelId: 'c', nights: 1 },
    ];
    const prices = new Map<string, number | null>([
      ['a', 1_000_000],
      ['b', 800_000],
      ['c', null],
    ]);
    expect(estimateStayCost(stays, prices)).toEqual({ total: 2_800_000, nights: 4, missing: 1 });
    expect(estimateStayCost([], prices)).toEqual({ total: 0, nights: 0, missing: 0 });
  });

  it('liệt kê các chặng bay hợp lệ theo thứ tự', () => {
    expect(
      listFlightRoutes({
        items: [
          { day: 1, title: 'Đi', transport: { mode: 'flight', fromAirport: 'HAN', toAirport: 'CXR' } },
          { day: 2, title: 'Xe', transport: { mode: 'bus' } },
          { day: 4, title: 'Về', transport: { mode: 'flight', fromAirport: 'CXR', toAirport: 'HAN' } },
        ],
      }),
    ).toEqual(['HAN → CXR', 'CXR → HAN']);
  });
});

describe('ảnh nhỏ từng điểm dừng', () => {
  it('ảnh riêng nếu chưa dùng; trùng hoặc thiếu thì lấy ảnh chưa dùng của chuyến; hết ảnh thì dùng lại ảnh riêng', () => {
    expect(assignStopThumbnails(['bien', 'bien', null, 'bien'], ['bien', 'dao', 'kayak'])).toEqual([
      'bien',
      'dao',
      'kayak',
      'bien',
    ]);
    expect(assignStopThumbnails([null], [])).toEqual([null]);
  });
});

describe('addStayStops', () => {
  const describeStay = ({ nights }: { nights: number }) => `${nights} đêm`;
  it('chèn khách sạn cấp chuyến vào ngày nhận phòng, sau chặng bay', () => {
    const days = [
      {
        day: 1,
        items: [
          { day: 1, title: 'Bay HAN → DLI', transport: { mode: 'flight' as const, fromAirport: 'HAN', toAirport: 'DLI' } },
          { day: 1, title: 'Hồ Xuân Hương' },
        ],
      },
      { day: 2, items: [{ day: 2, title: 'Cầu Đất' }] },
    ];
    const result = addStayStops(days, [{ day: 1, nights: 2, hotelId: 'h1', hotelName: 'Dalat Palace' }], describeStay);
    expect(result[0]?.items.map((item) => item.title)).toEqual(['Bay HAN → DLI', 'Dalat Palace', 'Hồ Xuân Hương']);
    expect(result[0]?.items[1]).toMatchObject({ location: '2 đêm', hotel: { hotelId: 'h1' } });
    expect(result[1]?.items).toHaveLength(1);
  });
  it('không chèn lại khi ngày đã có điểm cùng khách sạn', () => {
    const days = [{ day: 1, items: [{ day: 1, title: 'KS', hotel: { hotelId: 'h1' } }] }];
    expect(addStayStops(days, [{ day: 1, nights: 1, hotelId: 'h1' }], describeStay)[0]?.items).toHaveLength(1);
  });
});

describe('getTransportPrefixRoute', () => {
  it('bỏ chặng khi tiêu đề đã ghi', () => {
    expect(getTransportPrefixRoute('Bay HAN → DLI', 'HAN → DLI')).toBeNull();
    expect(getTransportPrefixRoute('Chuyến sáng', 'HAN → DLI')).toBe('HAN → DLI');
  });
});
