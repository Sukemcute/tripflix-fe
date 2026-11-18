import type { useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto, TravelPreferencesDto } from '@tripflix/api-client/core-api/model/index';
import { buildTravelPreferences, type SurveyDraft, type SurveyStatus } from '@tripflix/app-core';

type ApiSession = ReturnType<typeof useApiSession>['session'];

/**
 * Lưu khảo sát vào hồ sơ (PATCH /auth/me), rồi tải lại hồ sơ để biết server đã nhận.
 * `at` là lúc người dùng bấm hoàn tất, không phải lúc gửi: server giữ bản có updatedAt mới hơn.
 * Nhịp đi chưa có trong hợp đồng API nên không gửi.
 */
export async function saveSurveyToAccount(
  session: ApiSession,
  draft: SurveyDraft,
  status: SurveyStatus,
  previous: TravelPreferencesDto | null,
  at: Date,
): Promise<MyProfileDto> {
  await auth.accountControllerUpdateProfile({
    travelPreferences: buildTravelPreferences(draft, status, previous, at),
  });
  return session.reloadUser();
}
