import { emptyOnboarding, ONBOARDING_KEY, parseOnboarding, type OnboardingRecord } from '@tripflix/app-core';

// localStorage có thể bị chặn (chế độ riêng tư, hết dung lượng): mọi hàm đều không ném lỗi ra ngoài.
export function readSurveyRecord(): OnboardingRecord {
  try {
    return parseOnboarding(globalThis.localStorage.getItem(ONBOARDING_KEY));
  } catch {
    return emptyOnboarding();
  }
}

export function writeSurveyRecord(record: OnboardingRecord): boolean {
  try {
    globalThis.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearSurveyRecord(): void {
  try {
    globalThis.localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Không xoá được thì bản cũ còn lại; lần đăng nhập sau hồ sơ trên server vẫn là bản đúng.
  }
}
