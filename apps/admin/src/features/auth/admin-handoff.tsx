'use client';

import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AdminApiError } from '../shell/api-state';
import { takeHandoffCode } from './handoff-code';
import { WEB_LOGIN_URL } from './web-login';

/** /auth/handoff: web gửi nhân viên sang đây kèm mã một lần; đổi mã lấy phiên admin rồi vào dashboard. */
export function AdminHandoff() {
  const { session } = useApiSession();
  const router = useRouter();
  const hasStarted = useRef(false);
  const exchange = useMutation({
    mutationFn: (code: string) => session.exchangeAdminHandoff(code),
    onSuccess: () => router.replace('/'),
  });
  const { mutate } = exchange;

  useEffect(() => {
    // StrictMode chạy effect hai lần; lần hai không còn mã trong URL.
    if (hasStarted.current) return;
    hasStarted.current = true;
    const code = takeHandoffCode(window.location, window.history);
    if (code) mutate(code);
    else window.location.replace(WEB_LOGIN_URL);
  }, [mutate]);

  return (
    <main className="admin-main">
      {exchange.isError ? (
        <>
          <AdminApiError error={exchange.error} />
          <a href={WEB_LOGIN_URL}>{vi.api.loginRequired}</a>
        </>
      ) : (
        <output>{vi.api.loading}</output>
      )}
    </main>
  );
}
