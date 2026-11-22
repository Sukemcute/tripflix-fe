'use client';
import type {
  AdminSocialPostDetailDto,
  CreateModerationActionDtoAction,
  SocialModerationHistoryDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { DetailSection, KeyValueList } from '@/ui/detail-parts';
import { StatusBadge, type StatusTone } from '@/ui/status-badge';
import { ModerationParts } from './moderation-parts';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3100';

export const POST_ACTIONS: readonly CreateModerationActionDtoAction[] = ['hide', 'remove', 'restore'];
/** Hành động được phép theo trạng thái bài (giữ nguyên bản cũ). */
export const ALLOWED_POST_ACTIONS: Record<string, readonly CreateModerationActionDtoAction[]> = {
  draft: [],
  held: ['restore', 'hide', 'remove'],
  deleted: [],
  published: ['hide', 'remove'],
  hidden: ['restore', 'remove'],
  removed: ['restore'],
};
const HISTORY_LABEL: Record<string, string> = {
  hide: vi.api.moderationDidHide,
  remove: vi.api.moderationDidRemove,
  restore: vi.api.moderationDidRestore,
};
export type PostStatus = 'held' | 'draft' | 'published' | 'hidden' | 'removed' | 'deleted';

export const postStatusTone = (status: string): StatusTone =>
  status === 'published'
    ? 'success'
    : status === 'held'
      ? 'warning'
      : status === 'removed'
        ? 'danger'
        : 'neutral';

export const postStatusLabel = (status: string): string =>
  status === 'held' ? vi.api.moderationHeld : (vi.api[status as PostStatus] ?? status);

const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');

/** Nội dung bài trong drawer: một cột (tiêu đề, media đã quét, nội dung, lịch trình, số liệu, lịch sử). Hành động nằm ở footer. */
export function ModerationPostDetail({ post }: { post: AdminSocialPostDetailDto }) {
  const trip = post.trip_attachment;
  const status = post.status as PostStatus;

  return (
    <article aria-label={vi.api.moderationPostLabel}>
      <DetailSection title={post.title}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {trip?.destinationName && <span>{trip.destinationName}</span>}
          <span>{t('api.postPublishedOn', { date: formatDate(post.created_at) })}</span>
          <span>{post.author.display_name}</span>
        </div>
        {post.hashtags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={vi.api.moderationHashtags}>
            {post.hashtags.map((tag) => (
              <li key={tag}>
                <StatusBadge>#{tag}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
        {post.body.trim() ? (
          <p className="mt-3 text-sm leading-6 break-words whitespace-pre-wrap">{post.body}</p>
        ) : (
          <p className="mt-3 text-[13px] text-text-muted">{vi.api.moderationNoBody}</p>
        )}
        {status === 'published' && (
          <a
            className="mt-3 inline-block text-[13px] text-teal-ink underline underline-offset-2"
            href={`${WEB_URL}/inspiration?open=${encodeURIComponent(post.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            {vi.api.moderationViewOnWeb} ↗
          </a>
        )}
      </DetailSection>

      <ModerationParts postId={post.id} />

      {!!trip?.items?.length && (
        <DetailSection title={vi.api.postItinerary}>
          <ol className="space-y-3">
            {trip.items.map((item, index) => (
              <li key={index} className="flex gap-3 text-[13px]">
                <span className="w-14 shrink-0 text-xs text-text-muted">{t('api.postDay', { day: item.day })}</span>
                <div className="min-w-0">
                  <p>{item.title}</p>
                  {item.location && <p className="text-text-muted">{item.location}</p>}
                  {item.notes && <p className="text-text-muted">{item.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        </DetailSection>
      )}

      <DetailSection title={vi.moderationConsole.postsTab.stats}>
        <KeyValueList
          items={[
            { label: vi.api.postStats, value: t('api.postReactionsTotal', { count: post.reaction_total }) },
            { label: 'Bình luận', value: post.comment_count },
            { label: 'Chia sẻ', value: post.share_count },
            { label: 'Lưu', value: post.bookmark_count },
            { label: 'Cập nhật', value: formatDate(post.updated_at) },
          ]}
        />
      </DetailSection>

      <DetailSection title={vi.api.history}>
        <ModerationHistory entries={post.moderation_history} />
      </DetailSection>
    </article>
  );
}

function ModerationHistory({ entries }: { entries: SocialModerationHistoryDto[] }) {
  if (entries.length === 0) return <p className="text-[13px] text-text-muted">{vi.api.moderationNoHistory}</p>;
  return (
    <ol className="divide-y divide-border border-y border-border">
      {entries.map((entry) => (
        <li key={entry.action_id} className="py-2 text-[13px]">
          <p>{HISTORY_LABEL[entry.action] ?? entry.action}</p>
          <p className="text-text-muted">
            {entry.reason_code}
            {entry.reason_detail ? ` · ${entry.reason_detail}` : ''}
          </p>
          <time className="text-xs text-text-muted" dateTime={entry.created_at}>
            {new Date(entry.created_at).toLocaleString('vi-VN')}
          </time>
        </li>
      ))}
    </ol>
  );
}
