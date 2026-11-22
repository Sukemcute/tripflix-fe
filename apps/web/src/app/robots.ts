import type { MetadataRoute } from 'next';
import { toAbsoluteUrl } from '../lib/site';

/**
 * Máy tìm kiếm không vào trang riêng của người dùng (TF64): tài khoản, giỏ hàng, đặt chỗ, thanh toán, đăng nhập.
 * Trang công khai (khám phá, khách sạn, chuyến bay, chuyến đi, hồ sơ) vẫn được lập chỉ mục.
 */
export const DISALLOWED_PATHS = ['/api/', '/account', '/auth', '/bookings', '/cart', '/checkout', '/payments'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: DISALLOWED_PATHS }],
    // Chỉ đường cho máy tìm kiếm tới danh sách trang công khai (TF112).
    sitemap: toAbsoluteUrl('/sitemap.xml'),
  };
}
