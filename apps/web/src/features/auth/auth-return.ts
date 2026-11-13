import { describeDevice } from '@tripflix/app-core';

/** Chỉ quay lại các trang của web, không chuyển hướng sang địa chỉ lạ truyền qua ?returnTo=. */
export function readSafeReturnTo(returnTo: string): string {
  return /^\/(?:account(?:\/moderation)?|trips\/[^/?#]+|search|flights|bookings|hotels\/[^/?#]+|checkout\/[^/?#]+)(?:$|[?#])/.test(
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
