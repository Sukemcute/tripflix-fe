/**
 * App mobile đăng nhập Google qua trình duyệt (chạy được cả Expo Go, iPhone): Google POST ID token về web,
 * web chuyển token sang app. state do app tạo: `s=<mã ngẫu nhiên>&r=<địa chỉ quay về app>`.
 *
 * Chỉ trả token về `tripflix://` (app thật) hoặc `exp://` trong mạng LAN/máy (Expo Go khi dev). Không nhận
 * `exp://` công khai (tunnel): kẻ xấu có thể gửi link khiến token của nạn nhân rơi vào bundle Expo Go của họ.
 */
export function readMobileGoogleReturn(state: string | null): { returnUrl: string; requestId: string } | null {
  if (!state) return null;
  const params = new URLSearchParams(state);
  const requestId = params.get('s');
  const returnTo = params.get('r');
  if (!requestId || !/^[\w-]{16,64}$/.test(requestId) || !returnTo) return null;
  let url: URL;
  try {
    url = new URL(returnTo);
  } catch {
    return null;
  }
  const isAppScheme = url.protocol === 'tripflix:';
  const isLocalExpoGo = url.protocol === 'exp:' && isPrivateHost(url.hostname);
  if (!isAppScheme && !isLocalExpoGo) return null;
  url.hash = '';
  return { returnUrl: url.toString(), requestId };
}

function isPrivateHost(host: string): boolean {
  if (host === 'localhost') return true;
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** Địa chỉ mở lại app, token và lỗi nằm sau `#` để không lọt vào log máy chủ hay lịch sử điều hướng. */
export function buildMobileGoogleRedirect(
  target: { returnUrl: string; requestId: string },
  outcome: { idToken: string } | { error: string },
): string {
  const fragment = new URLSearchParams({ state: target.requestId });
  if ('idToken' in outcome) fragment.set('id_token', outcome.idToken);
  else fragment.set('error', outcome.error);
  return `${target.returnUrl}#${fragment.toString()}`;
}
