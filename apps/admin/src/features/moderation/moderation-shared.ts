import { moderationApi, socialApi } from '@tripflix/api-client';
import type { DecisionDto, ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';

export const REFRESH_MS = 30_000;
export const QUEUE_VIEWS = ['pending', 'reviewed', 'hidden', 'removed'] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];
export const SLA_FILTERS = ['all', 'overdue', 'due_soon'] as const;
export type SlaFilter = (typeof SLA_FILTERS)[number];
export const ASSIGNMENT_FILTERS = ['all', 'unassigned', 'mine'] as const;
export const CATEGORY_FILTERS = ['all', 'post', 'comment', 'report'] as const;
export const MODERATION_TABS = ['queue', 'appeals', 'scans', 'ocr', 'log', 'posts'] as const;
export type ModerationTab = (typeof MODERATION_TABS)[number];

export const formatDateTime = (value: string) => new Date(value).toLocaleString('vi-VN');

/** Điểm ưu tiên → tông huy hiệu: từ 80 là khẩn cấp, từ 50 là cần chú ý. */
export function severityTone(score: number): 'urgent' | 'warning' | 'neutral' {
  if (score >= 80) return 'urgent';
  if (score >= 50) return 'warning';
  return 'neutral';
}

/**
 * Áp một quyết định lên hồ sơ. Hồ sơ đang chờ đi qua phiên nhận (lease); hồ sơ đã xử lý thì sửa trực tiếp
 * bài viết hoặc bình luận. Logic giữ nguyên từ bản cũ của moderation-workspace.
 */
export async function applyDecision(item: ModerationCaseDto, body: DecisionDto): Promise<void> {
  if (item.status === 'pending') {
    await moderationApi.decide(item.id, { ...body, leaseId: item.leaseId ?? undefined });
  } else if (item.targetType === 'comment') {
    await moderationApi.commentAction(item.targetId, body);
  } else if (body.action !== 'dismiss') {
    await socialApi.moderatePost(item.targetId, {
      action: body.action,
      reason_code: body.reasonCode,
      reason_detail: body.reasonDetail,
    });
  } else {
    throw new Error('Hồ sơ đã được duyệt');
  }
}
