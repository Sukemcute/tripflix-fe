import type { MyProfileDto, TravelPreferencesDto } from '@tripflix/api-client/core-api/model/index';
import {
  buildTravelPreferences,
  emptyOnboarding,
  INTEREST_IDS,
  needsSurvey,
  ONBOARDING_KEY,
  PACE_IDS,
  parseOnboarding,
  type Interest,
  type OnboardingRecord,
  type OnboardingStep,
  type Pace,
} from '@tripflix/app-core';

// Bộ mã và định dạng bản nháp dùng chung với web nằm ở app-core (travel-survey.ts).
export { emptyOnboarding, INTEREST_IDS, ONBOARDING_KEY, PACE_IDS, parseOnboarding };
export type { Interest, OnboardingRecord, OnboardingStep, Pace };

/** Only interrupt a plain first launch. Links with a destination keep their route. */
export function shouldOfferOnboarding(record: OnboardingRecord, pathname: string, hasParams: boolean) {
  return pathname === '/' && !hasParams && (record.status === 'unseen' || record.status === 'draft');
}
export function needsAccountOnboarding(profile: MyProfileDto) {
  return needsSurvey(profile);
}

export function recordFromProfile(
  preferences: TravelPreferencesDto | null,
  cached?: OnboardingRecord,
): OnboardingRecord {
  const saved = preferences?.status === 'completed';
  return {
    version: 1,
    status: saved ? 'completed' : cached?.status === 'draft' ? 'draft' : (preferences?.status ?? 'unseen'),
    interests:
      saved || !cached
        ? (preferences?.interests ?? []).filter((id): id is Interest => INTEREST_IDS.includes(id as Interest))
        : cached.interests,
    pace: cached?.pace ?? null,
    step: !saved && cached?.status === 'draft' ? cached.step : 'welcome',
  };
}

export function profilePreferences(
  record: OnboardingRecord,
  status: 'completed' | 'skipped',
  previous: TravelPreferencesDto | null,
): TravelPreferencesDto {
  return buildTravelPreferences(record, status, previous);
}
