'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { isReviewLeaseActive } from './review-lease-state';
import styles from './review-queue.module.css';
const text = vi.moderation.review;
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
export function useReviewTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function ReviewStatus({
  item,
  actorId,
  now,
}: {
  item: ModerationCaseDto;
  actorId?: string;
  now: number;
}) {
  const active = isReviewLeaseActive(item, now);
  return (
    <div className={styles.status}>
      <span className={active ? styles.assigned : styles.muted}>
        {active
          ? item.assigneeId === actorId
            ? text.mineActive
            : `${text.otherActive} #${item.assigneeId?.slice(0, 8)}`
          : item.assigneeId
            ? text.expired
            : text.unassigned}
      </span>
      <time dateTime={item.dueAt} className={Date.parse(item.dueAt) <= now ? styles.overdue : styles.muted}>
        {Date.parse(item.dueAt) <= now ? `${text.overdue} · ` : ''}
        {text.deadline}: {date(item.dueAt)}
      </time>
    </div>
  );
}
export function ReviewLeasePanel({ item }: { item: ModerationCaseDto }) {
  const { user } = useApiSession();
  const client = useQueryClient();
  const now = useReviewTime();
  const active = isReviewLeaseActive(item, now),
    mine = active && item.assigneeId === user?.id;
  const mutation = useMutation({
    mutationFn: (action: 'claim' | 'renew' | 'release') =>
      moderationApi.reviewLease(item.id, action, item.leaseId ?? undefined),
    onSettled: () => client.invalidateQueries({ queryKey: ['moderation'] }),
  });
  if (item.status !== 'pending') return null;
  return (
    <section className={styles.lease} aria-label={text.operations}>
      <ReviewStatus item={item} actorId={user?.id} now={now} />
      {active && item.leaseExpiresAt && (
        <p>
          {text.leaseUntil}: <time dateTime={item.leaseExpiresAt}>{date(item.leaseExpiresAt)}</time>
        </p>
      )}
      <p>{text.claimFirst}</p>
      <div className={styles.actions}>
        {mine ? (
          <>
            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate('renew')}>
              {text.renew}
            </button>
            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate('release')}>
              {text.release}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={mutation.isPending || active}
            onClick={() => mutation.mutate('claim')}
          >
            {item.assigneeId ? text.reclaim : text.claim}
          </button>
        )}
      </div>
      <AdminApiError error={mutation.error} />
      {mutation.isSuccess && <output>{text.saved}</output>}
    </section>
  );
}
