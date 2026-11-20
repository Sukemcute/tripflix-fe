import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('@tripflix/api-client', () => ({
  moderationApi: {
    decide: vi.fn(async (id: string, body: unknown) => calls.push(`decide:${id}:${JSON.stringify(body)}`)),
    commentAction: vi.fn(async (id: string) => calls.push(`comment:${id}`)),
  },
  socialApi: { moderatePost: vi.fn(async (id: string) => calls.push(`post:${id}`)) },
}));

import type { DecisionDto, ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import { applyDecision, severityTone } from './moderation-shared';

const caseOf = (patch: Partial<ModerationCaseDto>) =>
  ({ id: 'c1', targetId: 't1', targetType: 'post', status: 'pending', leaseId: 'lease-1', ...patch }) as ModerationCaseDto;
const body = { action: 'hide', reasonCode: 'SPAM' } as unknown as DecisionDto;

describe('applyDecision', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('hồ sơ chờ duyệt đi qua decide kèm leaseId', async () => {
    await applyDecision(caseOf({}), body);
    expect(calls).toEqual(['decide:c1:{"action":"hide","reasonCode":"SPAM","leaseId":"lease-1"}']);
  });

  it('hồ sơ đã xử lý của bình luận sửa trực tiếp bình luận', async () => {
    await applyDecision(caseOf({ status: 'resolved', targetType: 'comment' }), body);
    expect(calls).toEqual(['comment:t1']);
  });

  it('hồ sơ đã xử lý của bài viết sửa trực tiếp bài viết', async () => {
    await applyDecision(caseOf({ status: 'resolved' }), body);
    expect(calls).toEqual(['post:t1']);
  });

  it('không cho bỏ qua hồ sơ bài viết đã duyệt', async () => {
    await expect(
      applyDecision(caseOf({ status: 'resolved' }), { action: 'dismiss', reasonCode: 'SPAM' } as unknown as DecisionDto),
    ).rejects.toThrow('Hồ sơ đã được duyệt');
    expect(calls).toEqual([]);
  });
});

describe('severityTone', () => {
  it('từ 80 là khẩn cấp, từ 50 là cần chú ý, còn lại trung tính', () => {
    expect(severityTone(95)).toBe('urgent');
    expect(severityTone(80)).toBe('urgent');
    expect(severityTone(79)).toBe('warning');
    expect(severityTone(50)).toBe('warning');
    expect(severityTone(49)).toBe('neutral');
  });
});
