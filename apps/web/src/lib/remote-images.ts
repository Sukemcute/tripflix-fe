/**
 * Host ảnh ngoài được Next tối ưu (resize, WebP/AVIF).
 * next.config.ts dùng danh sách này cho images.remotePatterns.
 * Host không có trong danh sách vẫn hiển thị, nhưng tải ảnh gốc (unoptimized),
 * để dữ liệu cũ trỏ sang host lạ không làm hỏng trang.
 */
export const OPTIMIZED_IMAGE_HOSTS = [
  // CDN ảnh của Tripflix (S3 + CloudFront, MEDIA_CDN_URL bên core-api).
  'd399hxccn6y84z.cloudfront.net',
  'images.unsplash.com',
] as const;

export function isOptimizedImageUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (OPTIMIZED_IMAGE_HOSTS as readonly string[]).includes(hostname);
  } catch {
    return false;
  }
}
