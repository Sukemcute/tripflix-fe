import { describeDevice } from '@tripflix/app-core';

/** Chỉ quay lại các trang của web, không chuyển hướng sang địa chỉ lạ truyền qua ?returnTo=. */
export function readSafeReturnTo(returnTo: string): string {
  // Trang chủ và Cảm hứng: khách hết lượt chat Tripi đăng nhập xong quay về đúng trang đang xem (TF31).
  return /^\/(?:account(?:\/moderation)?|trips\/[^/?#]+|search|flights|bookings|hotels\/[^/?#]+|checkout\/[^/?#]+|inspiration)?(?:$|[?#])/.test(
    returnTo,
  )
    ? returnTo
    : '/account';
}

/** Giữ ?returnTo= khi chuyển qua lại giữa trang đăng nhập và trang đăng ký. */
export function withReturnTo(path: '/login' | '/register', returnTo: string | undefined): string {
  return returnTo ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path;
}

export const readDeviceName = () => describeDevice(navigator.userAgent) ?? undefined;
