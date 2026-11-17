import type { MyProfileDto, TravelPreferencesDto } from '@tripflix/api-client/core-api/model/index';
import {
  buildTravelPreferences,
  INTEREST_IDS,
  needsSurvey,
  PACE_IDS,
  type Interest,
  type Pace,
} from '@tripflix/app-core';

export { INTEREST_IDS, PACE_IDS, type Interest, type Pace };
export const ONBOARDING_KEY = 'tripflix.onboarding.v1';
export type OnboardingStep = 'welcome' | 'interests' | 'pace' | 'review';
export type OnboardingRecord = {
  version: 1;
  status: 'unseen' | 'draft' | 'skipped' | 'completed';
  interests: Interest[];
  pace: Pace | null;
  step: OnboardingStep;
};

export function emptyOnboarding(): OnboardingRecord {
  return { version: 1, status: 'unseen', interests: [], pace: null, step: 'welcome' };
}

export function parseOnboarding(raw: string | null): OnboardingRecord {
  if (!raw) return emptyOnboarding();
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== 1 ||
      !['unseen', 'draft', 'skipped', 'completed'].includes(value.status) ||
      !['welcome', 'interests', 'pace', 'review'].includes(value.step) ||
      !Array.isArray(value.interests) ||
      !value.interests.every((id: unknown) => INTEREST_IDS.includes(id as Interest)) ||
      (value.pace !== null && !PACE_IDS.includes(value.pace))
    )
      return emptyOnboarding();
    return {
      version: 1,
      status: value.status,
      step: value.step,
      interests: [...new Set<Interest>(value.interests)],
      pace: value.pace,
    };
  } catch {
    return emptyOnboarding();
  }
}

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
