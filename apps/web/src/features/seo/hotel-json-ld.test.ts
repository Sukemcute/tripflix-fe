import { describe, expect, it } from 'vitest';
import { buildHotelJsonLd, serializeJsonLd } from './hotel-json-ld';
import { makeHotel } from './seo-fixtures';

const absolute = (path: string) => `https://tripflix.io.vn${path}`;

describe('buildHotelJsonLd', () => {
  it('khai báo Hotel đủ địa chỉ, toạ độ, hạng sao, đánh giá và giá', () => {
    const [hotel] = buildHotelJsonLd(makeHotel(), absolute);
    expect(hotel).toMatchObject({
      '@type': 'Hotel',
      name: 'Vinpearl Resort Nha Trang',
      url: 'https://tripflix.io.vn/hotels/hotel-1',
      address: { addressLocality: 'Nha Trang', addressRegion: 'Khánh Hòa', addressCountry: 'VN' },
      geo: { latitude: 12.2185, longitude: 109.2465 },
      starRating: { ratingValue: 5 },
      aggregateRating: { ratingValue: 4.6, reviewCount: 128, bestRating: 5 },
      priceRange: 'từ 2.150.000 VND',
      checkinTime: '14:00',
    });
  });

  it('bỏ aggregateRating khi chưa có đánh giá và bỏ trường rỗng', () => {
    const [hotel] = buildHotelJsonLd(
      makeHotel({
        rating: { average: 0, count: 0, source: null },
        location: null,
        priceFrom: null,
        stars: null,
      }),
      absolute,
    );
    expect(hotel).not.toHaveProperty('aggregateRating');
    expect(hotel).not.toHaveProperty('geo');
    expect(hotel).not.toHaveProperty('priceRange');
    expect(hotel).not.toHaveProperty('starRating');
  });

  it('breadcrumb đi từ trang chủ tới khách sạn', () => {
    const [, breadcrumb] = buildHotelJsonLd(makeHotel(), absolute);
    const items = (breadcrumb as { itemListElement: Array<{ position: number; item: string }> })
      .itemListElement;
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(items[2]!.item).toBe('https://tripflix.io.vn/hotels/hotel-1');
  });
});

describe('serializeJsonLd', () => {
  it('không để dữ liệu đóng thẻ script', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
