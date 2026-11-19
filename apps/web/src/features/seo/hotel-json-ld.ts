import type { HotelDetailDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { hotelPath } from './page-metadata';

type JsonLd = Record<string, unknown>;

/**
 * Dữ liệu có cấu trúc schema.org cho trang khách sạn: Hotel và BreadcrumbList (TF112). Breadcrumb chỉ có trang chủ
 * và khách sạn vì chưa có trang danh sách khách sạn được index (/search là noindex).
 */
export function buildHotelJsonLd(hotel: HotelDetailDto, toAbsoluteUrl: (path: string) => string): JsonLd[] {
  const url = toAbsoluteUrl(hotelPath(hotel.id));
  const images = hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : [];
  const hotelLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${url}#hotel`,
    name: hotel.name,
    url,
    ...(images.length ? { image: images.slice(0, 6) } : {}),
    ...(hotel.description ? { description: hotel.description } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(hotel.address ? { streetAddress: hotel.address } : {}),
      ...(hotel.city ? { addressLocality: hotel.city } : {}),
      ...(hotel.province?.name ? { addressRegion: hotel.province.name } : {}),
      addressCountry: 'VN',
    },
    ...(hotel.location
      ? { geo: { '@type': 'GeoCoordinates', latitude: hotel.location.lat, longitude: hotel.location.lng } }
      : {}),
    ...(hotel.stars ? { starRating: { '@type': 'Rating', ratingValue: hotel.stars } } : {}),
    ...(hotel.rating && hotel.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: hotel.rating.average,
            reviewCount: hotel.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(hotel.priceFrom
      ? { priceRange: t('seo.priceRangeFrom', { price: hotel.priceFrom.toLocaleString('vi-VN') }) }
      : {}),
    ...(hotel.checkInTime ? { checkinTime: hotel.checkInTime } : {}),
    ...(hotel.checkOutTime ? { checkoutTime: hotel.checkOutTime } : {}),
    ...(hotel.amenities.length
      ? {
          amenityFeature: hotel.amenities.slice(0, 20).map((amenity) => ({
            '@type': 'LocationFeatureSpecification',
            name: amenity.name,
            value: true,
          })),
        }
      : {}),
  };
  const breadcrumbLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: vi.seo.home, item: toAbsoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: hotel.name, item: url },
    ],
  };
  return [hotelLd, breadcrumbLd];
}

/** Chuỗi JSON an toàn để nhúng trong thẻ script: chặn `</script>` và ký tự xuống dòng JS trong dữ liệu. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
