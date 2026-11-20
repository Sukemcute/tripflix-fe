import { readSafeReturnTo } from '../auth/auth-return';

export type MobileTabId = 'home' | 'booking' | 'create' | 'inspiration' | 'me';

/** Tham số mở khung soạn bài trên trang Cảm hứng (nút ⊕ của thanh đáy). */
export const COMPOSE_PARAM = 'compose';
export type ComposeType = 'vlog' | 'video';

const BOOKING_PATH = /^\/(?:search|hotels\/[^/]+|flights|cart|bookings)(?:\/|$)/;
const INSPIRATION_PATH = /^\/(?:inspiration|trips\/[^/]+|trip-plans\/[^/]+)(?:\/|$)/;
const PROFILE_PATH = /^\/u\/([^/]+)\/?$/;
// Giữ cùng danh sách với isAssistantHidden (features/assistant/assistant-widget.tsx): các trang toàn màn hình.
const TAB_BAR_HIDDEN_PATH =
  /^\/(?:login|register|forgot-password|dat-lai-mat-khau|xac-thuc-email|checkout|payments|onboarding)(?:\/|$)/;

/** Mục thanh đáy đang chọn theo đường dẫn; null nếu trang không thuộc mục nào. */
export function findActiveMobileTab(pathname: string, userId: string | null): MobileTabId | null {
  if (pathname === '/') return 'home';
  if (BOOKING_PATH.test(pathname)) return 'booking';
  if (/^\/account(?:\/|$)/.test(pathname)) return 'me';
  const profileId = pathname.match(PROFILE_PATH)?.[1];
  if (profileId !== undefined) return userId !== null && decodeURIComponent(profileId) === userId ? 'me' : 'inspiration';
  if (INSPIRATION_PATH.test(pathname)) return 'inspiration';
  return null;
}

/** Trang toàn màn hình (đăng nhập, thanh toán, onboarding…) không có thanh đáy. */
export function isMobileTabBarHidden(pathname: string): boolean {
  return TAB_BAR_HIDDEN_PATH.test(pathname);
}

/** Link nút ⊕: tới Cảm hứng rồi mở khung soạn bài; đang ở Reels thì soạn video. Chưa đăng nhập thì qua trang đăng nhập. */
export function buildComposeHref(options: { pathname: string; search: string; isSignedIn: boolean }): string {
  const isReels = options.pathname === '/inspiration' && new URLSearchParams(options.search).get('view') === 'reels';
  const target = isReels ? `/inspiration?view=reels&${COMPOSE_PARAM}=video` : `/inspiration?${COMPOSE_PARAM}=vlog`;
  return options.isSignedIn ? target : `/login?returnTo=${encodeURIComponent(target)}`;
}

/** Link mục "Tôi": trang cá nhân; chưa đăng nhập thì trang đăng nhập, quay lại trang đang xem nếu được phép. */
export function buildMeHref(options: { userId: string | null; pathname: string }): string {
  if (options.userId) return `/u/${encodeURIComponent(options.userId)}`;
  const isSafeReturn = options.pathname !== '/' && readSafeReturnTo(options.pathname) === options.pathname;
  return isSafeReturn ? `/login?returnTo=${encodeURIComponent(options.pathname)}` : '/login';
}

export function readComposeType(value: string | null): ComposeType | null {
  return value === 'vlog' || value === 'video' ? value : null;
}

/** Bỏ ?compose= khỏi URL sau khi đã mở khung soạn bài, để Back hay F5 không mở lại. */
export function removeComposeParam(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(COMPOSE_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
