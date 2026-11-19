import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
export function isReviewLeaseActive(item: ModerationCaseDto, now: number): boolean {
  return (
    item.status === 'pending' &&
    !!item.assigneeId &&
    !!item.leaseId &&
    !!item.leaseExpiresAt &&
    Date.parse(item.leaseExpiresAt) > now
  );
}
export function canDecideReview(item: ModerationCaseDto, actorId: string | undefined, now: number): boolean {
  return item.status !== 'pending' || (isReviewLeaseActive(item, now) && item.assigneeId === actorId);
}
