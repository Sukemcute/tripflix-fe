import { getAuthErrorKind, HttpError, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Txt, ui } from '@/components/mobile-ui';
import { AuthButton as Button, AuthNotice as Notice, AuthErrorNotice as ApiErrorNotice } from './auth-ui';

/** Client web của Google: ID token mang aud này, nên BE (GOOGLE_CLIENT_IDS) nhận như token từ web. */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');

/**
 * Mở Google trong trình duyệt; Google gửi token về trang web /auth/google/mobile, trang đó mở lại app kèm token
 * sau `#`. Chạy được cả Expo Go (iPhone, Android) vì không cần module native.
 */
function openGoogleSignIn(requestId: string) {
  const query = new URLSearchParams({
    client_id: WEB_CLIENT_ID ?? '',
    redirect_uri: `${WEB_URL}/auth/google/mobile`,
    response_type: 'id_token',
    response_mode: 'form_post',
    scope: 'openid email profile',
    prompt: 'select_account',
    nonce: Crypto.randomUUID(),
    state: new URLSearchParams({ s: requestId, r: Linking.createURL('login') }).toString(),
  });
  void Linking.openURL(`https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`);
}

/** Đọc token từ địa chỉ mở lại app; chỉ nhận khi state khớp lần bấm của chính app này. */
function readGoogleCallback(url: string, requestId: string): { idToken: string } | { error: string } | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (params.get('state') !== requestId) return null;
  const idToken = params.get('id_token');
  return idToken ? { idToken } : { error: params.get('error') ?? 'unknown' };
}

/** "hoặc tiếp tục với" + nút Google. Đăng nhập xong gọi onLoggedIn (giống đăng nhập mật khẩu). */
export function GoogleLoginButton({ disabled, onLoggedIn }: { disabled: boolean; onLoggedIn: () => void }) {
  const { session, isReady } = useApiSession();
  const pendingRequestId = useRef<string | null>(null);
  const [isGoogleError, setGoogleError] = useState(false);
  const google = useMutation({
    mutationFn: (idToken: string) =>
      session.loginWithGoogle({ idToken, deviceName: Constants.deviceName ?? undefined }),
    onSuccess: onLoggedIn,
  });
  const { mutate } = google;

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const requestId = pendingRequestId.current;
      const callback = requestId ? readGoogleCallback(url, requestId) : null;
      if (!callback) return;
      pendingRequestId.current = null;
      // Người dùng bấm Huỷ ở Google thì không báo lỗi.
      if ('idToken' in callback) mutate(callback.idToken);
      else setGoogleError(callback.error !== 'access_denied');
    });
    return () => subscription.remove();
  }, [mutate]);

  if (!WEB_CLIENT_ID || !WEB_URL) return null;
  const kind = getAuthErrorKind(google.error, 'google');
  return (
    <>
      <Txt variant="small" style={[ui.muted, { textAlign: 'center' }]}>
        {vi.api.orContinueWith}
      </Txt>
      <Button
        tone="secondary"
        icon="logo-google"
        disabled={!isReady || disabled || google.isPending}
        onPress={() => {
          const requestId = Crypto.randomUUID();
          pendingRequestId.current = requestId;
          setGoogleError(false);
          google.reset();
          openGoogleSignIn(requestId);
        }}
      >
        {google.isPending ? vi.api.loggingIn : 'Google'}
      </Button>
      {kind ? (
        <Notice tone="error">{vi.api[kind]}</Notice>
      ) : google.error instanceof HttpError ? (
        <ApiErrorNotice error={google.error} />
      ) : (
        (isGoogleError || google.error) && <Notice tone="error">{vi.api.googleFailed}</Notice>
      )}
    </>
  );
}
