import { needsSurvey, type OnboardingRecord } from '@tripflix/app-core';
import { readSafeReturnTo } from '../auth/auth-return';

/**
 * Việc cần làm ngay sau khi đăng nhập/đăng ký thành công:
 * - continue: hồ sơ đã hoàn tất khảo sát (hoặc chưa có hồ sơ), đi tiếp.
 * - sync-local: khách đã làm xong khảo sát trên máy này, gửi lên hồ sơ một lần rồi đi tiếp.
 * - survey: mời làm khảo sát (chưa làm, đã bỏ qua, hoặc còn làm dở).
 */
export type PostAuthAction = 'continue' | 'sync-local' | 'survey';

export function decidePostAuth(
  profile: { travelPreferences?: { status: string } | null } | null,
  local: OnboardingRecord,
): PostAuthAction {
  if (!profile || !needsSurvey(profile)) return 'continue';
  return local.status === 'completed' ? 'sync-local' : 'survey';
}

/** Chỉ nhận đường dẫn nằm trong danh sách an toàn của web; khác thì về trang chủ (khách chưa có /account). */
export function readSurveyReturn(returnTo: string | undefined): string {
  if (!returnTo) return '/';
  return readSafeReturnTo(returnTo) === returnTo ? returnTo : '/';
}

export function surveyHref(returnTo: string, mode?: 'edit'): string {
  const params = new URLSearchParams({ returnTo });
  if (mode) params.set('mode', mode);
  return `/onboarding?${params.toString()}`;
}
