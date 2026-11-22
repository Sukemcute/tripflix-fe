import { describe, expect, it } from 'vitest';
import {
  buildHotelFallbackMetadata,
  buildHotelMetadata,
  buildProfileFallbackMetadata,
  buildProfileMetadata,
  buildTripPlanFallbackMetadata,
  buildTripPlanMetadata,
  DEFAULT_OG_IMAGE,
  NOINDEX_ROBOTS,
  toMetaDescription,
} from './page-metadata';
import { makeHotel, makePost } from './seo-fixtures';

describe('toMetaDescription', () => {
  it('gộp khoảng trắng và giữ nguyên chuỗi ngắn', () => {
    expect(toMetaDescription('  Biển   xanh\n cát trắng ')).toBe('Biển xanh cát trắng');
  });

  it('cắt chuỗi dài ở ranh giới từ, không vượt giới hạn', () => {
    const text = 'Lộ trình biển đảo rất đẹp '.repeat(20);
    const description = toMetaDescription(text, 60);
    expect(description.length).toBeLessThanOrEqual(60);
    expect(description.endsWith('…')).toBe(true);
    expect(description).not.toMatch(/\s…$/);
  });
});

describe('buildHotelMetadata', () => {
  it('đặt tiêu đề có nơi chốn, canonical theo id và ảnh khách sạn', () => {
    const metadata = buildHotelMetadata(makeHotel());
    expect(metadata.title).toBe(
      'Vinpearl Resort Nha Trang, Nha Trang, Khánh Hòa · Giá tốt, đặt phòng nhanh | Tripflix',
    );
    expect(metadata.description).toBe('Khu nghỉ dưỡng biển trên đảo Hòn Tre.');
    expect(metadata.alternates?.canonical).toBe('/hotels/hotel-1');
    expect(metadata.openGraph?.images).toEqual([
      'https://media.tripflix.io.vn/hotels/1.jpg',
      'https://media.tripflix.io.vn/hotels/2.jpg',
    ]);
  });

  it('bỏ trùng khi thành phố và tỉnh cùng tên, tự viết mô tả khi khách sạn chưa có', () => {
    const metadata = buildHotelMetadata(
      makeHotel({ city: 'Đà Nẵng', province: { slug: 'da-nang', name: 'Đà Nẵng' }, description: null }),
    );
    expect(metadata.title).toContain(', Đà Nẵng · ');
    expect(metadata.title).not.toContain('Đà Nẵng, Đà Nẵng');
    expect(metadata.description).toContain('Vinpearl Resort Nha Trang tại Đà Nẵng');
  });

  it('dùng ảnh mặc định khi khách sạn không có ảnh', () => {
    const metadata = buildHotelMetadata(makeHotel({ images: [], thumbnail: null }));
    expect(metadata.openGraph?.images).toEqual([DEFAULT_OG_IMAGE.url]);
  });

  it('metadata dự phòng vẫn có canonical khi API lỗi', () => {
    expect(buildHotelFallbackMetadata('abc').alternates?.canonical).toBe('/hotels/abc');
  });

  it('metadata dự phòng của cả ba loại trang đều noindex', () => {
    for (const metadata of [
      buildHotelFallbackMetadata('h'),
      buildTripPlanFallbackMetadata('p'),
      buildProfileFallbackMetadata('u'),
    ]) {
      expect(metadata.robots).toEqual(NOINDEX_ROBOTS);
    }
  });

  it('metadata đọc được dữ liệu thì không noindex', () => {
    expect(buildHotelMetadata(makeHotel()).robots).toBeUndefined();
  });
});

describe('buildTripPlanMetadata', () => {
  it('lấy tiêu đề bài, mô tả từ nội dung và ưu tiên ảnh poster chuyến đi', () => {
    const metadata = buildTripPlanMetadata(
      makePost({
        tripAttachment: { posterUrl: 'https://media.tripflix.io.vn/posters/p1.jpg' },
      }),
    );
    expect(metadata.title).toBe('Nha Trang 3 ngày 2 đêm | Tripflix');
    expect(metadata.description).toBe('Lịch trình biển đảo cho nhóm bạn.');
    expect(metadata.alternates?.canonical).toBe('/trip-plans/post-1');
    expect(metadata.openGraph?.images).toEqual([
      'https://media.tripflix.io.vn/posters/p1.jpg',
      'https://media.tripflix.io.vn/posts/1.jpg',
    ]);
  });
});

describe('buildProfileMetadata', () => {
  const sampleProfile = {
    id: 'user 1',
    displayName: 'Mai',
    followerCount: 1200,
    followingCount: 3,
    likeCount: 9,
  };

  it('ghi tên và số người theo dõi, cho index khi có ít nhất 1 bài công khai', () => {
    const metadata = buildProfileMetadata(sampleProfile, { hasPublicPosts: true });
    expect(metadata.title).toBe('Mai trên Tripflix | Tripflix');
    expect(metadata.description).toContain('1.200 người theo dõi');
    expect(metadata.alternates?.canonical).toBe('/u/user%201');
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      title: 'Mai trên Tripflix',
    });
  });

  it('đặt noindex khi hồ sơ chưa có bài công khai nhưng vẫn giữ Open Graph để chia sẻ', () => {
    const metadata = buildProfileMetadata(sampleProfile, { hasPublicPosts: false });
    expect(metadata.robots).toEqual(NOINDEX_ROBOTS);
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      title: 'Mai trên Tripflix',
      url: '/u/user%201',
    });
  });

  it('đặt noindex an toàn khi không kiểm tra được bài công khai (lỗi/timeout) và vẫn giữ Open Graph', () => {
    const metadata = buildProfileMetadata(sampleProfile, { hasPublicPosts: null });
    expect(metadata.robots).toEqual(NOINDEX_ROBOTS);
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      title: 'Mai trên Tripflix',
    });
  });
});
