// Khảo sát sở thích lúc onboarding, dùng chung cho mobile và web.
// Mã khớp enum của BE (access/account/domain/travel-preferences.ts): chỉ thêm vào cuối, không đổi tên mã đã lưu.
export const INTEREST_IDS = ['coast', 'nature', 'culture', 'food', 'city', 'stays'] as const;
export const PACE_IDS = ['slow', 'balanced', 'active'] as const;
export type Interest = (typeof INTEREST_IDS)[number];
export type Pace = (typeof PACE_IDS)[number];
/** Gợi ý chọn 2–5 sở thích, không ép buộc. */
export const SUGGESTED_INTEREST_RANGE = { min: 2, max: 5 } as const;

export type SurveyStatus = 'completed' | 'skipped';
export type SurveyDraft = { interests: readonly string[]; pace: Pace | null };

/** Phần của `TravelPreferencesDto` mà khảo sát cần đọc và ghi lại. */
export interface TravelPreferencesSnapshot {
  status: SurveyStatus;
  interests: string[];
  regions: string[];
  budgetLevels: string[];
  updatedAt: string;
}

/** Bản nháp/kết quả khảo sát lưu trên máy (khách, hoặc bản sao đang làm dở của tài khoản). */
export const ONBOARDING_KEY = 'tripflix.onboarding.v1';
export type OnboardingStep = 'welcome' | 'interests' | 'pace' | 'review';
const ONBOARDING_STEPS: readonly OnboardingStep[] = ['welcome', 'interests', 'pace', 'review'];
const ONBOARDING_STATUSES = ['unseen', 'draft', 'skipped', 'completed'] as const;
export type OnboardingRecord = {
  version: 1;
  status: (typeof ONBOARDING_STATUSES)[number];
  interests: Interest[];
  pace: Pace | null;
  /** Chỉ để app tự dùng, không gửi lên API. */
  step: OnboardingStep;
  /** ISO, lúc khách bấm hoàn tất trên máy; gửi làm updatedAt khi đăng nhập rồi mới lưu vào hồ sơ. */
  completedAt?: string;
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
      !ONBOARDING_STATUSES.includes(value.status) ||
      !ONBOARDING_STEPS.includes(value.step) ||
      !Array.isArray(value.interests) ||
      !value.interests.every(isInterest) ||
      (value.pace !== null && !isPace(value.pace))
    )
      return emptyOnboarding();
    const completedAt =
      typeof value.completedAt === 'string' && !Number.isNaN(Date.parse(value.completedAt))
        ? value.completedAt
        : undefined;
    return {
      version: 1,
      status: value.status,
      step: value.step,
      interests: normalizeInterests(value.interests),
      pace: value.pace,
      ...(completedAt && { completedAt }),
    };
  } catch {
    return emptyOnboarding();
  }
}

export const isInterest =(id: unknown): id is Interest => INTEREST_IDS.includes(id as Interest);
export const isPace = (id: unknown): id is Pace => PACE_IDS.includes(id as Pace);

/** Bỏ mã lạ và mã trùng, giữ thứ tự chuẩn của INTEREST_IDS. */
export function normalizeInterests(ids: readonly unknown[]): Interest[] {
  return INTEREST_IDS.filter((id) => ids.includes(id));
}

/** Hồ sơ chưa `completed` (chưa làm, đã bỏ qua hoặc null) thì mời làm khảo sát. */
export function needsSurvey(profile: { travelPreferences?: { status: string } | null }): boolean {
  return profile.travelPreferences?.status !== 'completed';
}

/**
 * Bản gửi PATCH /auth/me. Giữ vùng, mức chi phí và mã sở thích lạ đã có trong hồ sơ (web/BE có thể đã lưu).
 * `skipped` không đụng sở thích đã lưu trước đó.
 */
export function buildTravelPreferences<P extends TravelPreferencesSnapshot>(
  draft: SurveyDraft,
  status: SurveyStatus,
  previous: P | null,
  now: Date = new Date(),
): P {
  const kept = previous?.interests ?? [];
  const interests =
    status === 'skipped'
      ? kept
      : [...new Set([...normalizeInterests(draft.interests), ...kept.filter((id) => !isInterest(id))])];
  return {
    status,
    interests,
    regions: previous?.regions ?? [],
    budgetLevels: previous?.budgetLevels ?? [],
    updatedAt: now.toISOString(),
  } as P;
}
