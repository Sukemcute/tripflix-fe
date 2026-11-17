import { describe, expect, it } from 'vitest';
import {
  buildTravelPreferences,
  emptyOnboarding,
  INTEREST_IDS,
  needsSurvey,
  normalizeInterests,
  parseOnboarding,
  type TravelPreferencesSnapshot,
} from './travel-survey';

const saved: TravelPreferencesSnapshot = {
  status: 'completed',
  interests: ['coast', 'legacy-code'],
  regions: ['north'],
  budgetLevels: ['moderate'],
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const now = new Date('2026-11-18T10:00:00.000Z');

describe('travel survey', () => {
  it('có đủ 6 mã sở thích đúng như BE', () => {
    expect(INTEREST_IDS).toEqual(['coast', 'nature', 'culture', 'food', 'city', 'stays']);
  });

  it('normalizeInterests bỏ mã lạ, mã trùng và giữ thứ tự chuẩn', () => {
    expect(normalizeInterests(['stays', 'food', 'food', 'x', 'coast'])).toEqual(['coast', 'food', 'stays']);
  });

  it('parseOnboarding đọc bản hợp lệ, giữ completedAt, bỏ bản sai về rỗng', () => {
    const raw = JSON.stringify({
      version: 1,
      status: 'completed',
      interests: ['stays', 'food', 'food'],
      pace: 'slow',
      step: 'review',
      completedAt: '2026-11-17T10:00:00.000Z',
    });
    expect(parseOnboarding(raw)).toEqual({
      version: 1,
      status: 'completed',
      interests: ['food', 'stays'],
      pace: 'slow',
      step: 'review',
      completedAt: '2026-11-17T10:00:00.000Z',
    });
    expect(parseOnboarding(raw.replace('"food"', '"karaoke"'))).toEqual(emptyOnboarding());
    expect(parseOnboarding('{not json')).toEqual(emptyOnboarding());
    expect(parseOnboarding(null)).toEqual(emptyOnboarding());
    expect(parseOnboarding(raw.replace('2026-11-17T10:00:00.000Z', 'hôm qua')).completedAt).toBeUndefined();
  });

  it('needsSurvey: chỉ completed mới khỏi mời', () => {
    expect(needsSurvey({ travelPreferences: null })).toBe(true);
    expect(needsSurvey({})).toBe(true);
    expect(needsSurvey({ travelPreferences: { status: 'skipped' } })).toBe(true);
    expect(needsSurvey({ travelPreferences: { status: 'completed' } })).toBe(false);
  });

  it('completed lưu sở thích mới, giữ mã lạ, vùng, mức chi phí; updatedAt là lúc hoàn tất', () => {
    const next = buildTravelPreferences({ interests: ['food', 'city'], pace: 'slow' }, 'completed', saved, now);
    expect(next).toEqual({
      status: 'completed',
      interests: ['food', 'city', 'legacy-code'],
      regions: ['north'],
      budgetLevels: ['moderate'],
      updatedAt: '2026-11-18T10:00:00.000Z',
    });
  });

  it('skipped không xoá sở thích đã lưu', () => {
    const next = buildTravelPreferences({ interests: [], pace: null }, 'skipped', saved, now);
    expect(next.interests).toEqual(['coast', 'legacy-code']);
    expect(next.status).toBe('skipped');
  });

  it('chưa có hồ sơ cũ: vùng và mức chi phí rỗng, không gửi pace', () => {
    const next = buildTravelPreferences({ interests: ['coast'], pace: 'active' }, 'completed', null, now);
    expect(next).toEqual({
      status: 'completed',
      interests: ['coast'],
      regions: [],
      budgetLevels: [],
      updatedAt: '2026-11-18T10:00:00.000Z',
    });
    expect('pace' in next).toBe(false);
  });
});
