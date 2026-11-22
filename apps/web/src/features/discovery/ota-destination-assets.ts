/**
 * Quản lý kho asset ảnh mặc định cho các điểm đến trên FE.
 * Cơ chế Fallback 4 tầng:
 * 1. API Image URL (nếu có và là URL http/https hợp lệ)
 * 2. Province / Destination Asset (ảnh thực tế độ phân giải cao được lưu trữ cục bộ)
 * 3. Regional / Theme Fallback (ảnh theo đặc thù vùng miền: núi cao, biển đảo, sông nước, di sản)
 * 4. Safe Runtime Fallback (bảo đảm không bao giờ vỡ ảnh)
 */

export const DEFAULT_DESTINATION_FALLBACK = '/brand/vietnam.jpg';
export const DEFAULT_STAY_FALLBACK = '/brand/hotel.jpg';
export const DEFAULT_EXPERIENCE_FALLBACK = '/brand/home-hoi-an-lanterns.jpg';

export interface DestinationAssetEntry {
  spotlight: string;
  experience: string;
  view?: string;
  stayFallback?: string;
}

export const DESTINATION_ASSET_REGISTRY: Record<string, DestinationAssetEntry> = {
  'phu-tho': {
    spotlight: '/brand/destinations/phu-tho-spotlight.jpg',
    experience: '/brand/destinations/phu-tho-experience.jpg',
    view: '/brand/destinations/phu-tho-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'dong-nai': {
    spotlight: '/brand/destinations/dong-nai-spotlight.jpg',
    experience: '/brand/destinations/dong-nai-experience.jpg',
    view: '/brand/destinations/dong-nai-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'tay-ninh': {
    spotlight: '/brand/destinations/tay-ninh-spotlight.jpg',
    experience: '/brand/destinations/tay-ninh-experience.jpg',
    view: '/brand/destinations/tay-ninh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'quang-tri': {
    spotlight: '/brand/destinations/quang-tri-spotlight.jpg',
    experience: '/brand/destinations/quang-tri-experience.jpg',
    view: '/brand/destinations/quang-tri-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'cao-bang': {
    spotlight: '/brand/destinations/cao-bang-spotlight.jpg',
    experience: '/brand/destinations/cao-bang-experience.jpg',
    view: '/brand/destinations/cao-bang-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'can-tho': {
    spotlight: '/brand/destinations/can-tho-spotlight.jpg',
    experience: '/brand/destinations/can-tho-experience.jpg',
    view: '/brand/destinations/can-tho-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'da-lat': {
    spotlight: '/brand/destinations/da-lat-spotlight.jpg',
    experience: '/brand/destinations/da-lat-cafe.webp',
    view: '/brand/destinations/da-lat-view.jpg',
    stayFallback: '/brand/destinations/da-lat-view.jpg',
  },
  'lam-dong': {
    spotlight: '/brand/destinations/da-lat-spotlight.jpg',
    experience: '/brand/destinations/da-lat-cafe.webp',
    view: '/brand/destinations/da-lat-view.jpg',
    stayFallback: '/brand/destinations/da-lat-view.jpg',
  },
  'nha-trang': {
    spotlight: '/brand/destinations/nha-trang-spotlight.jpg',
    experience: '/brand/destinations/nha-trang-experience.jpg',
    view: '/brand/destinations/nha-trang-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'khanh-hoa': {
    spotlight: '/brand/destinations/nha-trang-spotlight.jpg',
    experience: '/brand/destinations/nha-trang-experience.jpg',
    view: '/brand/destinations/nha-trang-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'hoi-an': {
    spotlight: '/brand/destinations/hoi-an-spotlight.jpg',
    experience: '/brand/destinations/hoi-an-experience.jpg',
    view: '/brand/destinations/hoi-an-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'quang-nam': {
    spotlight: '/brand/destinations/hoi-an-spotlight.jpg',
    experience: '/brand/destinations/hoi-an-experience.jpg',
    view: '/brand/destinations/hoi-an-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'phu-quoc': {
    spotlight: '/brand/destinations/phu-quoc-spotlight.jpg',
    experience: '/brand/destinations/phu-quoc-experience.jpg',
    view: '/brand/destinations/phu-quoc-view.jpg',
    stayFallback: '/brand/home-shore.jpg',
  },
  'kien-giang': {
    spotlight: '/brand/destinations/phu-quoc-spotlight.jpg',
    experience: '/brand/destinations/phu-quoc-experience.jpg',
    view: '/brand/destinations/phu-quoc-view.jpg',
    stayFallback: '/brand/home-shore.jpg',
  },
  'ha-noi': {
    spotlight: '/brand/destinations/ha-noi-spotlight.jpg',
    experience: '/brand/destinations/ha-noi-experience.jpg',
    view: '/brand/destinations/ha-noi-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'ho-chi-minh': {
    spotlight: '/brand/destinations/ho-chi-minh-spotlight.jpg',
    experience: '/brand/destinations/ho-chi-minh-experience.jpg',
    view: '/brand/destinations/ho-chi-minh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'sai-gon': {
    spotlight: '/brand/destinations/ho-chi-minh-spotlight.jpg',
    experience: '/brand/destinations/ho-chi-minh-experience.jpg',
    view: '/brand/destinations/ho-chi-minh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'quang-ninh': {
    spotlight: '/brand/destinations/quang-ninh-spotlight.jpg',
    experience: '/brand/destinations/quang-ninh-experience.jpg',
    view: '/brand/destinations/quang-ninh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'ha-long': {
    spotlight: '/brand/destinations/quang-ninh-spotlight.jpg',
    experience: '/brand/destinations/quang-ninh-experience.jpg',
    view: '/brand/destinations/quang-ninh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'ninh-binh': {
    spotlight: '/brand/destinations/ninh-binh-spotlight.jpg',
    experience: '/brand/destinations/ninh-binh-experience.jpg',
    view: '/brand/destinations/ninh-binh-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'lao-cai': {
    spotlight: '/brand/destinations/lao-cai-spotlight.jpg',
    experience: '/brand/destinations/lao-cai-view.jpg',
    view: '/brand/destinations/lao-cai-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'sa-pa': {
    spotlight: '/brand/destinations/lao-cai-spotlight.jpg',
    experience: '/brand/destinations/lao-cai-view.jpg',
    view: '/brand/destinations/lao-cai-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
  'hue': {
    spotlight: '/brand/destinations/hue-spotlight.jpg',
    experience: '/brand/destinations/hue-experience.jpg',
    view: '/brand/destinations/hue-view.jpg',
    stayFallback: '/brand/hotel.jpg',
  },
};

/**
 * Kiểm tra xem một URL ảnh có hợp lệ để hiển thị trên trình duyệt hay không.
 * Các URL dạng dev/mockup nội bộ (e.g. dev/unknown/images/hotels/...) không hiển thị được sẽ trả về false.
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('/brand/')) return true;
  return false;
}

/**
 * Lấy ảnh spotlight cho Box 1 của điểm đến.
 * Ưu tiên: API ảnh hợp lệ -> Asset riêng của tỉnh -> Fallback vùng miền -> Fallback quốc gia.
 */
export function resolveDestinationSpotlightImage(slug: string, apiImage?: string | null): string {
  if (isValidImageUrl(apiImage)) return apiImage!;
  const normalized = slug.toLowerCase().trim();
  const entry = DESTINATION_ASSET_REGISTRY[normalized];
  if (entry?.spotlight) return entry.spotlight;

  // Fallback theo nhóm địa hình nếu là tỉnh khác
  if (['lao-cai', 'yen-bai', 'ha-giang', 'son-la', 'lai-chau', 'dien-bien', 'kon-tum', 'gia-lai'].includes(normalized)) {
    return '/brand/flight-sky.jpg';
  }
  if (['da-nang', 'binh-dinh', 'phu-yen', 'ninh-thuan', 'binh-thuan', 'ba-ria-vung-tau'].includes(normalized)) {
    return '/brand/sea.jpg';
  }
  if (['an-giang', 'dong-thap', 'vinh-long', 'ben-tre', 'tien-giang', 'ca-mau', 'bac-lieu'].includes(normalized)) {
    return '/brand/home-kayaking.jpg';
  }

  return DEFAULT_DESTINATION_FALLBACK;
}

/**
 * Lấy ảnh trải nghiệm cà phê/ẩm thực cho Box 3.
 */
export function resolveDestinationExperienceImage(slug: string, apiImage?: string | null): string {
  if (isValidImageUrl(apiImage)) return apiImage!;
  const normalized = slug.toLowerCase().trim();
  const entry = DESTINATION_ASSET_REGISTRY[normalized];
  if (entry?.experience) return entry.experience;

  return DEFAULT_EXPERIENCE_FALLBACK;
}

/**
 * Lấy ảnh khách sạn cho Box 2.
 */
export function resolveStayImage(slug: string, apiThumbnail?: string | null): string {
  if (isValidImageUrl(apiThumbnail)) return apiThumbnail!;
  const normalized = slug.toLowerCase().trim();
  const entry = DESTINATION_ASSET_REGISTRY[normalized];
  if (entry?.stayFallback) return entry.stayFallback;

  return DEFAULT_STAY_FALLBACK;
}
