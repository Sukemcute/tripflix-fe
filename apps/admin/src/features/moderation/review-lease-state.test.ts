import { describe, it, expect } from 'vitest';
import { canDecideReview, isReviewLeaseActive } from './review-lease-state';
import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
const now = Date.parse('2026-11-18T00:00:00Z');
const base = {
  id: 'case',
  status: 'pending',
  assigneeId: 'A',
  leaseId: 'lease',
  leaseExpiresAt: '2026-11-18T00:15:00Z',
} as ModerationCaseDto;
describe('review capabilities', () => {
  it('allows only the active owner and blocks the exact expiry boundary', () => {
    expect(canDecideReview(base, 'A', now)).toBe(true);
    expect(canDecideReview(base, 'B', now)).toBe(false);
    expect(canDecideReview(base, undefined, now)).toBe(false);
    expect(canDecideReview(base, 'A', Date.parse(base.leaseExpiresAt!))).toBe(false);
  });
  it('requires a complete lease before enabling pending decisions', () => {
    for (const patch of [
      { assigneeId: null },
      { leaseId: null },
      { leaseExpiresAt: null },
      { leaseExpiresAt: 'invalid' },
    ]) {
      expect(isReviewLeaseActive({ ...base, ...patch }, now)).toBe(false);
      expect(canDecideReview({ ...base, ...patch }, 'A', now)).toBe(false);
    }
    expect(canDecideReview({ ...base, status: 'resolved', leaseId: null }, 'A', now)).toBe(true);
  });
});
