import { describe, expect, it } from 'vitest';
import { groupItineraryLines, parseItineraryLine, parseWeatherLine } from './assistant-card-format';

describe('lộ trình Tripi', () => {
  it('đọc dòng lộ trình tự lên: ngày, buổi, điểm, quãng đường', () => {
    expect(
      parseItineraryLine({ label: 'Ngày 1 · Sáng', detail: 'Quảng trường Lâm Viên · khoảng 1.2 km, 5 phút' }),
    ).toEqual({
      day: 1,
      stop: {
        part: 'morning',
        partLabel: 'Sáng',
        title: 'Quảng trường Lâm Viên',
        place: null,
        distanceKm: 1.2,
        minutes: 5,
        service: null,
      },
    });
  });

  it('đọc dòng dịch vụ Tripflix lồng trong lộ trình (chuyến bay, khách sạn)', () => {
    const days = groupItineraryLines([
      { label: 'Ngày 1 · ✈ Bay SGN → DLI 14:30–16:10', detail: 'Bay TP.HCM – Đà Lạt 14:30', service: 'flight' },
      { label: 'Ngày 1 · Nhận phòng D. House', detail: '21/11', service: 'stay' },
      { label: 'Ngày 1 · chiều', detail: 'Chùa Tàu · khoảng 1 km, 2 phút' },
    ]);
    expect(days[0]?.stops.map((stop) => stop.service)).toEqual(['flight', 'stay', null]);
    expect(days[0]?.stops[0]).toMatchObject({
      partLabel: '✈ Bay SGN → DLI 14:30–16:10',
      title: 'Bay TP.HCM – Đà Lạt 14:30',
    });
  });

  it('đọc dòng lộ trình của reel: hoạt động · nơi, không có quãng đường', () => {
    expect(parseItineraryLine({ label: 'Ngày 2', detail: 'Ngắm hoàng hôn · Bãi Dài' }).stop).toEqual({
      part: null,
      partLabel: null,
      title: 'Ngắm hoàng hôn',
      place: 'Bãi Dài',
      distanceKm: null,
      minutes: null,
      service: null,
    });
  });

  it('dòng lạ giữ nguyên văn', () => {
    const { day, stop } = parseItineraryLine({ label: 'Điểm', detail: 'Chợ Bến Thành' });
    expect(day).toBeNull();
    expect(stop.title).toBe('Chợ Bến Thành');
    expect(parseItineraryLine({ label: 'Ghé quán cà phê bất kỳ' }).stop.title).toBe('Ghé quán cà phê bất kỳ');
  });

  it('gom theo ngày, giữ thứ tự', () => {
    const days = groupItineraryLines([
      { label: 'Ngày 1 · Sáng', detail: 'A · khoảng 1 km, 3 phút' },
      { label: 'Ngày 1 · Tối', detail: 'B · khoảng 2,5 km, 8 phút' },
      { label: 'Ngày 2 · Chiều', detail: 'C' },
    ]);
    expect(days.map((day) => [day.day, day.stops.map((stop) => stop.title)])).toEqual([
      [1, ['A', 'B']],
      [2, ['C']],
    ]);
    expect(days[0]?.stops[1]).toMatchObject({ part: 'evening', distanceKm: 2.5, minutes: 8 });
  });
});

describe('thời tiết Tripi', () => {
  it('đọc đúng định dạng AI gửi', () => {
    expect(parseWeatherLine('15–22°C, mưa rào, mưa 60%')).toEqual({
      minC: 15,
      maxC: 22,
      sky: 'mưa rào',
      skyKind: 'rain',
      rainChance: 60,
    });
  });

  it('nhận trời nắng, nhiều mây, giông; thiếu số thì để null', () => {
    expect(parseWeatherLine('16-23°C · nắng nhẹ · 20% mưa').skyKind).toBe('sunny');
    expect(parseWeatherLine('20–28°C, nhiều mây, mưa 10%').skyKind).toBe('cloudy');
    expect(parseWeatherLine('24–30°C, có dông').skyKind).toBe('storm');
    expect(parseWeatherLine('không rõ')).toMatchObject({ minC: null, maxC: null, rainChance: null });
  });
});
