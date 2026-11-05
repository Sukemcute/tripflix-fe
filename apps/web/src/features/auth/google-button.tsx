'use client';
import { vi } from '@tripflix/i18n';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

// Google Identity Services nạp thẳng từ Google (không cần thư viện npm). Chỉ dùng phần nút đăng nhập.
interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode: 'popup';
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type: 'standard';
          theme: 'outline';
          size: 'large';
          text: 'continue_with';
          shape: 'pill';
          locale: string;
          width: number;
        },
      ): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Nút "Tiếp tục với Google". Chưa đặt NEXT_PUBLIC_GOOGLE_CLIENT_ID thì không hiện gì (BE cũng trả 503).
 * Google trả ID token (credential), trang gửi cho core-api qua session.loginWithGoogle.
 */
export function GoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const container = useRef<HTMLDivElement>(null);
  // Giữ callback mới nhất mà không phải khởi tạo lại Google mỗi lần render.
  const latestOnCredential = useRef(onCredential);
  const [isScriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    latestOnCredential.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const parent = container.current;
    const google = window.google;
    if (!clientId || !isScriptReady || !parent || !google) return;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => latestOnCredential.current(response.credential),
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    google.accounts.id.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      locale: 'vi',
      width: Math.min(parent.offsetWidth || 360, 400),
    });
  }, [clientId, isScriptReady]);

  if (!clientId) return null;
  return (
    <>
      {/* onReady chạy cả khi script đã nạp từ lần trước (quay lại trang đăng nhập). */}
      <Script src={GOOGLE_SCRIPT_URL} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div className="auth-divider" aria-hidden="true">
        <span>{vi.api.orContinueWith}</span>
      </div>
      {/* Google tự vẽ nút vào thẻ này, React không đặt phần tử con nào bên trong. */}
      <div ref={container} className="auth-google" aria-busy={!isScriptReady} />
      {!isScriptReady && <p className="auth-hint">{vi.api.googleLoading}</p>}
    </>
  );
}
