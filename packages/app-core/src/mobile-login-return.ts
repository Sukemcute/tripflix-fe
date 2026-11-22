/** Chỉ quay về các màn có luồng yêu cầu đăng nhập. */
export function resolveMobileLoginReturn(returnTo: unknown): string {
  if (
    typeof returnTo === 'string' &&
    (returnTo === '/assistant' ||
      /^\/(?:\(tabs\)|trip\/[^/?#]+|trip-builder|saved|create|cart|account-settings)(?:$|\/)/.test(returnTo) ||
      /^\/(?:flights|payments\/vnpay\/return)(?:\?|$)/.test(returnTo))
  ) {
    return returnTo;
  }
  return '/(tabs)/me';
}
