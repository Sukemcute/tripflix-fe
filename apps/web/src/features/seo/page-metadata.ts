import type {
  HotelDetailDto,
  PublicProfileDto,
  SocialPostDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import type { Metadata } from 'next';

const BRAND_SUFFIX = ' | Tripflix';

/** Trang không nên lên kết quả tìm kiếm (form, trang tạm, kết quả lọc) nhưng link bên trong vẫn được theo. */
export const NOINDEX_ROBOTS: Metadata['robots'] = { index: false, follow: true };

/** Ảnh chia sẻ mặc định khi trang không khai báo ảnh riêng. */
export const DEFAULT_OG_IMAGE = {
  url: '/brand/tripflix-social-preview.png',
  width: 1200,
  height: 630,
  alt: vi.seo.ogImageAlt,
};
const DESCRIPTION_MAX_LENGTH = 160;

/** Mô tả cho máy tìm kiếm: gộp khoảng trắng, cắt ở ranh giới từ cho vừa đoạn trích kết quả tìm kiếm. */
export function toMetaDescription(text: string, maxLength = DESCRIPTION_MAX_LENGTH): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  const cut = compact.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:·-]+$/, '')}…`;
}

function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  images: string[];
  type?: 'website' | 'article' | 'profile';
}): Metadata {
  const ownImages = input.images.filter((image) => image.trim()).slice(0, 4);
  const images = ownImages.length ? ownImages : [DEFAULT_OG_IMAGE.url];
  return {
    title: `${input.title}${BRAND_SUFFIX}`,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: input.type ?? 'website',
      url: input.path,
      title: input.title,
      description: input.description,
      siteName: vi.app.name,
      locale: 'vi_VN',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images,
    },
  };
}

/**
 * Đường dẫn chuẩn của khách sạn theo id: link nội bộ (tìm kiếm, lộ trình) và sitemap đều dùng id, nên canonical
 * cũng theo id để mọi nguồn trỏ về một URL. API vẫn mở được bằng slug.
 */
export function hotelPath(hotelId: string): string {
  return `/hotels/${encodeURIComponent(hotelId)}`;
}

export function tripPlanPath(postId: string): string {
  return `/trip-plans/${encodeURIComponent(postId)}`;
}

export function profilePath(userId: string): string {
  return `/u/${encodeURIComponent(userId)}`;
}

/** Tỉnh/thành để ghép vào tiêu đề, bỏ trùng khi city và province cùng tên. */
function describeHotelPlace(hotel: Pick<HotelDetailDto, 'city' | 'province'>): string {
  const parts = [hotel.city, hotel.province?.name].filter((part): part is string => !!part?.trim());
  return [...new Set(parts)].join(', ');
}

export function buildHotelMetadata(hotel: HotelDetailDto): Metadata {
  const place = describeHotelPlace(hotel);
  const title = place
    ? t('seo.hotelTitleWithPlace', { name: hotel.name, place })
    : t('seo.hotelTitle', { name: hotel.name });
  const description = toMetaDescription(
    hotel.description?.trim() ||
      (place
        ? t('seo.hotelDescriptionWithPlace', { name: hotel.name, place })
        : t('seo.hotelDescription', { name: hotel.name })),
  );
  const images = hotel.images.length ? hotel.images : hotel.thumbnail ? [hotel.thumbnail] : [];
  return buildPageMetadata({ title, description, path: hotelPath(hotel.id), images });
}

/**
 * Metadata khi không đọc được dữ liệu (không tồn tại, không công khai, API lỗi): noindex để trang lỗi trả 200
 * không lên kết quả tìm kiếm; lần crawl sau đọc được dữ liệu thì trang được index lại.
 */
export function buildHotelFallbackMetadata(slug: string): Metadata {
  return {
    title: `${vi.seo.hotelFallbackTitle}${BRAND_SUFFIX}`,
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: hotelPath(slug) },
  };
}

export function buildTripPlanMetadata(post: SocialPostDto): Metadata {
  const title = post.title.trim() || vi.seo.tripPlanFallbackTitle;
  const description = toMetaDescription(post.body.trim() || t('seo.tripPlanDescription', { title }));
  const images = [
    ...(post.tripAttachment?.posterUrl ? [post.tripAttachment.posterUrl] : []),
    ...(post.images ?? []).map((image) => image.url),
  ];
  return buildPageMetadata({ title, description, path: tripPlanPath(post.id), images, type: 'article' });
}

export function buildTripPlanFallbackMetadata(postId: string): Metadata {
  return {
    title: `${vi.seo.tripPlanFallbackTitle}${BRAND_SUFFIX}`,
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: tripPlanPath(postId) },
  };
}

export function buildProfileMetadata(profile: PublicProfileDto): Metadata {
  const name = profile.displayName.trim() || vi.seo.profileFallbackTitle;
  return buildPageMetadata({
    title: t('seo.profileTitle', { name }),
    description: t('seo.profileDescription', {
      name,
      followers: profile.followerCount.toLocaleString('vi-VN'),
    }),
    path: profilePath(profile.id),
    images: [],
    type: 'profile',
  });
}

export function buildProfileFallbackMetadata(userId: string): Metadata {
  return {
    title: `${vi.seo.profileFallbackTitle}${BRAND_SUFFIX}`,
    robots: NOINDEX_ROBOTS,
    alternates: { canonical: profilePath(userId) },
  };
}
