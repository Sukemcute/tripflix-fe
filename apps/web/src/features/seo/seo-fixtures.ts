import type { HotelDetailDto, SocialPostDto } from '@tripflix/api-client/core-api/model/index';

/** Dữ liệu mẫu cho test SEO; chỉ điền trường các builder đọc tới. */
export function makeHotel(overrides: Partial<HotelDetailDto> = {}): HotelDetailDto {
  return {
    id: 'hotel-1',
    slug: 'vinpearl-resort-nha-trang',
    name: 'Vinpearl Resort Nha Trang',
    province: { slug: 'khanh-hoa', name: 'Khánh Hòa' },
    city: 'Nha Trang',
    stars: 5,
    brand: 'Vinpearl',
    style: null,
    thumbnail: 'https://media.tripflix.io.vn/hotels/thumb.jpg',
    images: ['https://media.tripflix.io.vn/hotels/1.jpg', 'https://media.tripflix.io.vn/hotels/2.jpg'],
    address: 'Đảo Hòn Tre',
    location: { lat: 12.2185, lng: 109.2465 },
    rating: { average: 4.6, count: 128, source: null },
    checkInTime: '14:00',
    checkOutTime: '12:00',
    description: 'Khu nghỉ dưỡng biển trên đảo Hòn Tre.',
    highlights: [],
    nearby: [],
    amenities: [{ group: 'general', name: 'Hồ bơi', icon: 'pool', featured: true }],
    languages: [],
    facts: {} as HotelDetailDto['facts'],
    policies: {} as HotelDetailDto['policies'],
    stay: {} as HotelDetailDto['stay'],
    priceFrom: 2_150_000,
    isAvailable: true,
    rooms: [],
    calendar: [],
    ...overrides,
  };
}

export function makePost(overrides: Partial<SocialPostDto> = {}): SocialPostDto {
  return {
    id: 'post-1',
    authorId: 'user-1',
    authorName: 'Mai',
    postType: 'image' as SocialPostDto['postType'],
    title: 'Nha Trang 3 ngày 2 đêm',
    body: 'Lịch trình biển đảo cho nhóm bạn.',
    hashtags: [],
    status: 'published',
    visibility: 'public',
    isVerified: false,
    mediaIds: [],
    coverMediaId: null,
    images: [{ id: 'img-1', url: 'https://media.tripflix.io.vn/posts/1.jpg', widthPx: 1080, heightPx: 1350 }],
    tripAttachment: { hotelId: 'vinpearl-resort-nha-trang', hotelName: 'Vinpearl', daysCount: 3 },
    reactionCounts: {} as SocialPostDto['reactionCounts'],
    reactionTotal: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    publishedAt: '2026-11-10T08:00:00.000Z',
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}
