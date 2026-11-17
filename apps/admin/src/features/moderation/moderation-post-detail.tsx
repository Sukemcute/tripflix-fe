'use client';
import type {
  AdminSocialPostDetailDto,
  CreateModerationActionDtoAction,
  SocialModerationHistoryDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { formatDateTime } from '../ui/format';
import { Icon } from '../ui/icon';
import { Badge, Button, controlClass, fieldLabelClass } from '../ui/primitives';
import { POST_STATUS_TONE, postStatusLabel } from './post-status';

/** Ảnh bìa theo điểm đến, cùng bộ ảnh với trang bài viết bên web (apps/web post-cover.ts). */
const DESTINATION_COVERS = new Map([
  ['nha trang', '/brand/sea.jpg'],
  ['hội an', '/brand/hoian.jpg'],
  ['đà nẵng', '/brand/home-shore.jpg'],
]);
const COVER_MASCOT = '/brand/tripi-welcome.png';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3100';

const ACTIONS: readonly CreateModerationActionDtoAction[] = ['hide', 'remove', 'restore'];
const ALLOWED_ACTIONS: Record<string, readonly CreateModerationActionDtoAction[]> = {
  draft: [],
  held: ['restore', 'hide', 'remove'],
  deleted: [],
  published: ['hide', 'remove'],
  hidden: ['restore', 'remove'],
  removed: ['restore'],
};
const ACTION_VARIANT = { hide: 'primary', remove: 'danger', restore: 'accent' } as const;
const HISTORY_LABEL: Record<string, string> = {
  hide: vi.api.moderationDidHide,
  remove: vi.api.moderationDidRemove,
  restore: vi.api.moderationDidRestore,
};
const HISTORY_DOT: Record<string, string> = { hide: 'bg-coral', remove: 'bg-danger', restore: 'bg-teal' };

export function ModerationPostDetail({
  post,
  reason,
  onReasonChange,
  onAction,
  isPending,
  notice,
}: {
  post: AdminSocialPostDetailDto;
  reason: string;
  onReasonChange: (value: string) => void;
  onAction: (action: CreateModerationActionDtoAction) => void;
  isPending: boolean;
  /** Lỗi hoặc thông báo "Đã lưu" của lần xử lý gần nhất. */
  notice: ReactNode;
}) {
  const trip = post.trip_attachment;
  const cover = DESTINATION_COVERS.get(trip?.destinationName?.trim().toLowerCase() ?? '');
  const status = post.status;
  const authorName = post.author.display_name;
  const isLocked = status === 'deleted' || status === 'draft';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <article className="flex min-w-0 flex-col gap-4" aria-label={vi.api.moderationPostLabel}>
        <header className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {trip?.destinationName && <Badge tone="navy">{trip.destinationName}</Badge>}
            <span>{t('api.postPublishedOn', { date: formatDateTime(post.created_at) })}</span>
            <Badge tone={POST_STATUS_TONE[status] ?? 'neutral'} hasDot>
              {postStatusLabel(status)}
            </Badge>
          </p>
          <h2 className="text-lg font-bold text-text">{post.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className="grid size-7 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy"
              aria-hidden="true"
            >
              {authorName.trim().charAt(0).toUpperCase() || 'T'}
            </span>
            <span className="font-semibold">{authorName}</span>
            {post.hashtags.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label={vi.api.moderationHashtags}>
                {post.hashtags.map((tag) => (
                  <li key={tag} className="text-xs text-teal-ink">
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {post.media_ids.length > 0 && (
          <figure className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-sea-mist">
            {cover ? (
              <Image src={cover} alt="" fill sizes="(max-width: 1100px) 100vw, 55vw" className="object-cover" />
            ) : (
              <Image src={COVER_MASCOT} alt="" width={120} height={120} />
            )}
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-overlay-heavy px-2.5 py-1 text-xs font-semibold text-background">
              {t('api.moderationMediaCount', { count: post.media_ids.length })}
            </figcaption>
          </figure>
        )}

        {post.body.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">{post.body}</p>
        ) : (
          <p className="text-sm text-text-muted">{vi.api.moderationNoBody}</p>
        )}

        {!!trip?.items?.length && (
          <section aria-labelledby="admin-post-itinerary-title" className="rounded-xl border border-border p-4">
            <h3 id="admin-post-itinerary-title" className="mb-3 text-sm font-bold">
              {vi.api.postItinerary}
            </h3>
            <ol className="flex flex-col gap-3">
              {trip.items.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span className="h-fit shrink-0 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal-ink">
                    {t('api.postDay', { day: item.day })}
                  </span>
                  <div className="text-sm">
                    <strong>{item.title}</strong>
                    {item.location && <p className="text-text-muted">{item.location}</p>}
                    {item.notes && <p className="text-text-muted">{item.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {status === 'published' && (
          <a
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-teal-ink hover:underline"
            href={`${WEB_URL}/inspiration?open=${encodeURIComponent(post.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            {vi.api.moderationViewOnWeb}
            <Icon name="external" size={14} />
          </a>
        )}
      </article>

      <aside className="flex flex-col gap-3">
        <section className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-bold tracking-wider text-text-muted uppercase">{vi.api.postStats}</p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li>{t('api.postReactionsTotal', { count: post.reaction_total })}</li>
            <li>{t('api.moderationComments', { count: post.comment_count })}</li>
            <li>{t('api.postShares', { count: post.share_count })}</li>
            <li>{t('api.postSaves', { count: post.bookmark_count })}</li>
          </ul>
          <p className="mt-2 text-xs text-text-muted">
            {t('api.moderationUpdatedOn', { date: formatDateTime(post.updated_at) })}
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-xs font-bold tracking-wider text-text-muted uppercase">{vi.api.moderationActions}</p>
            <p className="mt-1 text-xs text-text-muted">{vi.api.moderationActionsHint}</p>
          </div>
          {status === 'deleted' && (
            <p className="text-xs text-text-muted">Bài đã được tác giả xóa, không thể khôi phục hoặc kiểm duyệt lại.</p>
          )}
          {status === 'draft' && (
            <p className="text-xs text-text-muted">Bài đang là bản nháp. Chỉ xử lý kiểm duyệt sau khi bài được đăng.</p>
          )}
          <label className={fieldLabelClass}>
            {vi.api.reason}
            <select
              required
              className={controlClass}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              disabled={isPending || isLocked}
            >
              <option value="">Chọn lý do kiểm duyệt</option>
              {Object.entries(vi.moderation.reasons).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {notice}
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={ACTION_VARIANT[action]}
                disabled={isPending || !reason.trim() || !ALLOWED_ACTIONS[status]?.includes(action)}
                onClick={() => onAction(action)}
              >
                {status === 'held' && action === 'restore' ? vi.api.moderationReleaseHeld : vi.api[action]}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-bold tracking-wider text-text-muted uppercase">{vi.api.history}</p>
          <ModerationHistory entries={post.moderation_history} />
        </section>
      </aside>
    </div>
  );
}

function ModerationHistory({ entries }: { entries: SocialModerationHistoryDto[] }) {
  if (entries.length === 0) return <p className="text-xs text-text-muted">{vi.api.moderationNoHistory}</p>;
  return (
    <ol className="flex flex-col gap-2.5">
      {entries.map((entry) => (
        <li key={entry.action_id} className="flex gap-2.5 text-sm">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', HISTORY_DOT[entry.action] ?? 'bg-text-subtle')} />
          <span className="min-w-0">
            <strong className="block">{HISTORY_LABEL[entry.action] ?? entry.action}</strong>
            <span className="block text-xs text-text-muted">
              {entry.reason_code}
              {entry.reason_detail ? ` · ${entry.reason_detail}` : ''}
            </span>
            <time className="text-xs text-text-subtle" dateTime={entry.created_at}>
              {formatDateTime(entry.created_at)}
            </time>
          </span>
        </li>
      ))}
    </ol>
  );
}
