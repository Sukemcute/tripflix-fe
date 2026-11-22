'use client';
import { useApiSession } from '@tripflix/api-client';
import { useEffect, useRef } from 'react';
import { clearSurveyRecord } from './survey-storage';

/** Đăng xuất (hoặc phiên hết hạn) thì xoá bản khảo sát trên máy, người dùng khác dùng chung trình duyệt không thấy. */
export function SurveyLogoutCleanup() {
  const { user } = useApiSession();
  const lastUserId = useRef<string | null>(null);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (lastUserId.current && !userId) clearSurveyRecord();
    lastUserId.current = userId;
  }, [userId]);
  return null;
}
