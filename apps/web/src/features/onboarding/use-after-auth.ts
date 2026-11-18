'use client';
import { useApiSession } from '@tripflix/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { readSafeReturnTo } from '../auth/auth-return';
import { decidePostAuth, surveyHref } from './post-auth';
import { readSurveyRecord } from './survey-storage';
import { saveSurveyToAccount } from './survey-account';

/**
 * Chạy sau khi đăng nhập/đăng ký (mật khẩu hoặc Google) thành công, thay cho việc quay thẳng về trang cũ:
 * hồ sơ đã hoàn tất thì đi tiếp; khách đã làm khảo sát trên máy thì gửi lên hồ sơ một lần; còn lại mở khảo sát.
 */
export function useAfterAuth(returnTo: string | undefined) {
  const { session } = useApiSession();
  const router = useRouter();
  const client = useQueryClient();
  return useCallback(async () => {
    const destination = readSafeReturnTo(returnTo ?? '/account');
    const profile = session.getSnapshot().user;
    const local = readSurveyRecord();
    const action = decidePostAuth(profile, local);
    if (profile && action === 'sync-local') {
      try {
        const me = await saveSurveyToAccount(
          session,
          local,
          'completed',
          profile.travelPreferences,
          new Date(local.completedAt ?? Date.now()),
        );
        client.setQueryData(['account', 'me', profile.id], me);
      } catch {
        // Gửi lỗi thì giữ bản trên máy, lần đăng nhập sau sẽ gửi lại. Không chặn người dùng vào trang.
      }
    }
    router.replace(action === 'survey' ? surveyHref(destination) : destination);
  }, [client, returnTo, router, session]);
}
