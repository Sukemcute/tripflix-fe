export const ONBOARDING_KEY = 'tripflix.onboarding.v1';
export const INTEREST_IDS = ['coast', 'nature', 'culture', 'stays'] as const;
export const PACE_IDS = ['slow', 'balanced', 'active'] as const;
export type Interest = (typeof INTEREST_IDS)[number];
export type Pace = (typeof PACE_IDS)[number];
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
