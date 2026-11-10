import { describe, expect, it } from 'vitest';
import { parseFullSearchParams, parseSearchParams } from './search-params';
import { addStayDays, getStayToday } from './stay-search-validation';

function createReader(params: Record<string, string>) {
  return (key: string) => params[key] ?? '';
}

describe('parseSearchParams', () => {
  const today = getStayToday();

  it('xử lý placeId sai định dạng khi không có q và khi có q', () => {
    // Không có q, placeId sai định dạng -> fallback về điểm đến mặc định (nha-trang)
    const result1 = parseSearchParams(createReader({ placeId: 'ha-long@invalid!' }));
    expect(result1.initialFilters.placeId).toBe('nha-trang');
    expect(result1.placeName).toBe('Nha Trang');

    // Có q, placeId sai định dạng -> placeId rỗng, placeName lấy theo q
    const result2 = parseSearchParams(createReader({ placeId: 'ha-long@invalid!', q: 'Hạ Long Bay' }));
    expect(result2.initialFilters.placeId).toBe('');
    expect(result2.placeName).toBe('Hạ Long Bay');
  });

  it('xử lý query q rỗng và có q hợp lệ', () => {
    const withoutQ = parseSearchParams(createReader({ placeId: 'da-nang' }));
    expect(withoutQ.initialFilters.placeId).toBe('da-nang');
    expect(withoutQ.placeName).toBe('Đà Nẵng');

    const withQ = parseSearchParams(createReader({ q: 'Resort view biển' }));
    expect(withQ.initialFilters.placeId).toBe('');
    expect(withQ.placeName).toBe('Resort view biển');
  });

  it('chuẩn hoá ngày checkIn ở quá khứ về tương lai', () => {
    const result = parseSearchParams(
      createReader({ placeId: 'nha-trang', checkIn: '2020-01-01', checkOut: '2020-01-05' }),
    );
    expect(result.initialFilters.checkIn).toBe(addStayDays(today, 1));
    expect(result.initialFilters.checkOut).toBe(addStayDays(today, 3));
  });

  it('chuẩn hoá checkOut không hợp lệ hoặc nhỏ hơn checkIn', () => {
    const tomorrow = addStayDays(today, 1);
    // checkOut nhỏ hơn checkIn
    const result1 = parseSearchParams(
      createReader({ placeId: 'nha-trang', checkIn: tomorrow, checkOut: today }),
    );
    expect(result1.initialFilters.checkIn).toBe(tomorrow);
    expect(result1.initialFilters.checkOut).toBe(addStayDays(tomorrow, 2));

    // checkOut sai định dạng chuỗi ngày
    const result2 = parseSearchParams(
      createReader({ placeId: 'nha-trang', checkIn: tomorrow, checkOut: 'khong-phai-ngay' }),
    );
    expect(result2.initialFilters.checkIn).toBe(addStayDays(today, 1));
    expect(result2.initialFilters.checkOut).toBe(addStayDays(today, 3));
  });

  it('lọc bỏ adults, rooms, minStars, stars khi ngoài khoảng hợp lệ', () => {
    const outOfBounds = parseSearchParams(
      createReader({
        placeId: 'nha-trang',
        adults: '0',
        rooms: '10',
        minStars: '6',
        stars: '0',
      }),
    );
    expect(outOfBounds.initialFilters.adults).toBeUndefined();
    expect(outOfBounds.initialFilters.rooms).toBeUndefined();
    expect(outOfBounds.initialFilters.minStars).toBeUndefined();
    expect(outOfBounds.initialFilters.stars).toBeUndefined();

    const valid = parseSearchParams(
      createReader({
        placeId: 'nha-trang',
        adults: '4',
        rooms: '2',
        minStars: '4',
        stars: '5',
      }),
    );
    expect(valid.initialFilters.adults).toBe('4');
    expect(valid.initialFilters.rooms).toBe('2');
    expect(valid.initialFilters.minStars).toBe('4');
    expect(valid.initialFilters.stars).toBe('5');
  });

  it('bỏ qua khoảng giá khi priceMin > priceMax hoặc không hợp lệ', () => {
    const invalidRange = parseSearchParams(
      createReader({
        placeId: 'nha-trang',
        priceMin: '5000000',
        priceMax: '1000000',
      }),
    );
    expect(invalidRange.initialFilters.priceMin).toBeUndefined();
    expect(invalidRange.initialFilters.priceMax).toBeUndefined();

    const validRange = parseSearchParams(
      createReader({
        placeId: 'nha-trang',
        priceMin: '1000000',
        priceMax: '5000000',
      }),
    );
    expect(validRange.initialFilters.priceMin).toBe('1000000');
    expect(validRange.initialFilters.priceMax).toBe('5000000');
  });

  it('chỉ chấp nhận các kiểu sort hợp lệ', () => {
    const weirdSort = parseSearchParams(
      createReader({ placeId: 'nha-trang', sort: 'unknown_sort' }),
    );
    expect(weirdSort.initialFilters.sort).toBeUndefined();

    const starsSort = parseSearchParams(
      createReader({ placeId: 'nha-trang', sort: 'stars' }),
    );
    expect(starsSort.initialFilters.sort).toBe('stars');

    const priceDescSort = parseSearchParams(
      createReader({ placeId: 'nha-trang', sort: 'price_desc' }),
    );
    expect(priceDescSort.initialFilters.sort).toBe('price_desc');
  });
});

describe('parseFullSearchParams', () => {
  it('điền mặc định cho trường thiếu và lấy tên điểm đến từ URL', () => {
    const result = parseFullSearchParams('placeId=da-nang&stars=4&sort=stars');
    expect(result.placeName).toBe('Đà Nẵng');
    expect(result.filters).toMatchObject({
      placeId: 'da-nang',
      adults: '2',
      rooms: '',
      minStars: '',
      stars: '4',
      priceMin: '',
      priceMax: '',
      sort: 'stars',
    });
    expect(result.filters.checkIn).toBeTruthy();
    expect(result.filters.checkOut).toBeTruthy();
  });

  it('query rỗng rơi về điểm đến mặc định giống bản render server', () => {
    const result = parseFullSearchParams('');
    expect(result.filters.placeId).toBe('nha-trang');
    expect(result.placeName).toBe('Nha Trang');
  });

  it('tên điểm đến lấy theo q, không phụ thuộc chữ người dùng đang gõ', () => {
    expect(parseFullSearchParams('q=Hạ%20Long&placeId=ha-long').placeName).toBe('Hạ Long');
  });
});
