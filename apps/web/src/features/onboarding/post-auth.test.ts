import { emptyOnboarding, type OnboardingRecord } from '@tripflix/app-core';
import { describe, expect, it } from 'vitest';
import { decidePostAuth, readSurveyReturn, surveyHref } from './post-auth';

const local = (status: OnboardingRecord['status']): OnboardingRecord => ({ ...emptyOnboarding(), status });

describe('decidePostAuth', () => {
  it('hồ sơ đã completed thì đi tiếp, dù bản trên máy là gì', () => {
    expect(decidePostAuth({ travelPreferences: { status: 'completed' } }, local('draft'))).toBe('continue');
  });

  it('khách đã làm xong trên máy, hồ sơ chưa completed: gửi một lần', () => {
    expect(decidePostAuth({ travelPreferences: null }, local('completed'))).toBe('sync-local');
    expect(decidePostAuth({ travelPreferences: { status: 'skipped' } }, local('completed'))).toBe(
      'sync-local',
    );
  });

  it('chưa làm, đã bỏ qua hoặc làm dở thì mời khảo sát', () => {
    for (const status of ['unseen', 'draft', 'skipped'] as const) {
      expect(decidePostAuth({ travelPreferences: null }, local(status))).toBe('survey');
    }
    expect(decidePostAuth({}, local('unseen'))).toBe('survey');
  });

  it('chưa có hồ sơ thì không làm gì', () => {
    expect(decidePostAuth(null, local('completed'))).toBe('continue');
  });
});

describe('readSurveyReturn', () => {
  it('giữ đường dẫn an toàn, còn lại về trang chủ', () => {
    expect(readSurveyReturn('/account')).toBe('/account');
    expect(readSurveyReturn('/trips/abc?x=1')).toBe('/trips/abc?x=1');
    expect(readSurveyReturn(undefined)).toBe('/');
    expect(readSurveyReturn('https://evil.example')).toBe('/');
    expect(readSurveyReturn('//evil.example')).toBe('/');
    expect(readSurveyReturn('/admin')).toBe('/');
  });
});

describe('surveyHref', () => {
  it('mã hoá returnTo và thêm mode khi sửa', () => {
    expect(surveyHref('/trips/abc?x=1')).toBe('/onboarding?returnTo=%2Ftrips%2Fabc%3Fx%3D1');
    expect(surveyHref('/account', 'edit')).toBe('/onboarding?returnTo=%2Faccount&mode=edit');
  });
});
