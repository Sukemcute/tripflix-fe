import { getAuthErrorKind, HttpError, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { Button, Notice, Txt, ui } from '@/components/mobile-ui';
import { ApiErrorNotice } from '@/components/api-state';

/** Client web của Google: ID token mang aud này, nên BE (GOOGLE_CLIENT_IDS) nhận như token từ web. */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
// Expo Go không có module native Google Sign-In; iOS chưa có client iOS. Khi đó ẩn nút.
const isAvailable =
  Platform.OS === 'android' &&
  !!WEB_CLIENT_ID &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Trả ID token Google, hoặc null khi người dùng đóng bảng chọn tài khoản. */
async function requestGoogleIdToken(): Promise<string | null> {
  // Nạp lúc bấm: import tĩnh sẽ làm app crash ngay khi mở trong Expo Go.
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Mỗi lần bấm đều cho chọn lại tài khoản, không tự lấy tài khoản lần trước.
  await GoogleSignin.signOut();
  const response = await GoogleSignin.signIn();
  return isSuccessResponse(response) ? response.data.idToken : null;
}

/** "hoặc tiếp tục với" + nút Google. Đăng nhập xong gọi onLoggedIn (giống đăng nhập mật khẩu). */
export function GoogleLoginButton({ disabled, onLoggedIn }: { disabled: boolean; onLoggedIn: () => void }) {
  const { session, isReady } = useApiSession();
  const google = useMutation({
    mutationFn: async () => {
      const idToken = await requestGoogleIdToken();
      if (!idToken) return false;
      await session.loginWithGoogle({ idToken, deviceName: Constants.deviceName ?? undefined });
      return true;
    },
    onSuccess: (isLoggedIn) => {
      if (isLoggedIn) onLoggedIn();
    },
  });
  if (!isAvailable) return null;
  const kind = getAuthErrorKind(google.error, 'google');
  return (
    <>
      <Txt variant="small" style={[ui.muted, { textAlign: 'center' }]}>
        {vi.api.orContinueWith}
      </Txt>
      <Button tone="secondary" icon="logo-google" disabled={!isReady || disabled || google.isPending} onPress={() => google.mutate()}>
        {google.isPending ? vi.api.googleLoading : 'Google'}
      </Button>
      {kind ? (
        <Notice tone="error">{vi.api[kind]}</Notice>
      ) : google.error instanceof HttpError ? (
        <ApiErrorNotice error={google.error} />
      ) : (
        google.error && <Notice tone="error">{vi.api.googleFailed}</Notice>
      )}
    </>
  );
}
