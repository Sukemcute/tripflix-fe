'use client';
import type {
  AdminSocialPostDetailDto,
  CreateModerationActionDtoAction,
  SocialModerationHistoryDto,
} from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import type { ReactNode } from 'react';

/** Ảnh bìa theo điểm đến, cùng bộ ảnh với trang bài viết bên web (apps/web post-cover.ts). */
const DESTINATION_COVERS = new Map([
  ['nha trang', '/brand/sea.jpg'],
  ['hội an', '/brand/hoian.jpg'],
  ['đà nẵng', '/brand/home-shore.jpg'],
]);
const COVER_MASCOT = '/brand/tripi-welcome.png';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3100';

const ACTIONS: readonly CreateModerationActionDtoAction[] = ['hide', 'remove', 'restore'];
/** Hành động không đổi được gì ở trạng thái hiện tại thì khóa nút. */
const NO_OP_STATUS: Record<CreateModerationActionDtoAction, string> = {
  hide: 'hidden',
  remove: 'removed',
  restore: 'published',
};
const HISTORY_LABEL: Record<string, string> = {
  hide: vi.api.moderationDidHide,
  remove: vi.api.moderationDidRemove,
  restore: vi.api.moderationDidRestore,
};
type PostStatus = 'draft' | 'published' | 'hidden' | 'removed' | 'deleted';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'T';
}

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
  const status = post.status as PostStatus;
  const authorName = post.author.display_name;

  return (
    <div className="admin-post-layout">
      <article className="admin-post-main" aria-label={vi.api.moderationPostLabel}>
        <header>
          <p className="admin-post-kicker">
            {trip?.destinationName && <span>{trip.destinationName}</span>}
            <span>{t('api.postPublishedOn', { date: formatDate(post.created_at) })}</span>
            <span className={`admin-post-status is-${status}`}>{vi.api[status] ?? post.status}</span>
          </p>
          <h2>{post.title}</h2>
          <div className="admin-post-byline">
            <span className="admin-post-avatar" aria-hidden="true">
              {getInitial(authorName)}
            </span>
            <span>{authorName}</span>
            {post.hashtags.length > 0 && (
              <ul className="admin-post-tags" aria-label={vi.api.moderationHashtags}>
                {post.hashtags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {post.media_ids.length > 0 && (
          <figure className={cover ? 'admin-post-cover' : 'admin-post-cover is-brand'}>
            {cover ? (
              <Image src={cover} alt="" fill sizes="(max-width: 1100px) 100vw, 55vw" />
            ) : (
              <Image className="admin-post-mascot" src={COVER_MASCOT} alt="" width={120} height={120} />
            )}
            <figcaption>{t('api.moderationMediaCount', { count: post.media_ids.length })}</figcaption>
          </figure>
        )}

        {post.body.trim() ? (
          <p className="admin-post-body">{post.body}</p>
        ) : (
          <p className="admin-post-muted">{vi.api.moderationNoBody}</p>
        )}

        {!!trip?.items?.length && (
          <section className="admin-post-itinerary" aria-labelledby="admin-post-itinerary-title">
            <h3 id="admin-post-itinerary-title">{vi.api.postItinerary}</h3>
            <ol>
              {trip.items.map((item, index) => (
                <li key={index}>
                  <span className="admin-post-day">{t('api.postDay', { day: item.day })}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.location && <p>{item.location}</p>}
                    {item.notes && <p>{item.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {status === 'published' && (
          <a
            className="admin-text-button admin-post-web-link"
            href={`${WEB_URL}/trips/${encodeURIComponent(post.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            {vi.api.moderationViewOnWeb} ↗
          </a>
        )}
      </article>

      <aside className="admin-post-aside">
        <section className="admin-post-card">
          <p className="admin-eyebrow">{vi.api.postStats}</p>
          <ul className="admin-post-stats">
            <li>{t('api.postReactionsTotal', { count: post.reaction_total })}</li>
            <li>{t('api.moderationComments', { count: post.comment_count })}</li>
            <li>{t('api.postShares', { count: post.share_count })}</li>
            <li>{t('api.postSaves', { count: post.bookmark_count })}</li>
          </ul>
          <p className="admin-post-muted">
            {t('api.moderationUpdatedOn', { date: formatDate(post.updated_at) })}
          </p>
        </section>

        <section className="admin-post-card">
          <p className="admin-eyebrow">{vi.api.moderationActions}</p>
          <p className="admin-post-muted">{vi.api.moderationActionsHint}</p>
          <label className="admin-post-reason">
            {vi.api.reason}
            <input
              required
              maxLength={200}
              placeholder={vi.api.moderationReasonPlaceholder}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
            />
          </label>
          {notice}
          <div className="admin-post-actions">
            {ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className={action === 'remove' ? 'admin-secondary is-danger' : 'admin-secondary'}
                disabled={isPending || !reason.trim() || NO_OP_STATUS[action] === status}
                onClick={() => onAction(action)}
              >
                {vi.api[action]}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-post-card">
          <p className="admin-eyebrow">{vi.api.history}</p>
          <ModerationHistory entries={post.moderation_history} />
        </section>
      </aside>
    </div>
  );
}

function ModerationHistory({ entries }: { entries: SocialModerationHistoryDto[] }) {
  if (entries.length === 0) return <p className="admin-post-muted">{vi.api.moderationNoHistory}</p>;
  return (
    <ol className="admin-post-history">
      {entries.map((entry) => (
        <li key={entry.action_id} className={`is-${entry.action}`}>
          <strong>{HISTORY_LABEL[entry.action] ?? entry.action}</strong>
          <span>
            {entry.reason_code}
            {entry.reason_detail ? ` · ${entry.reason_detail}` : ''}
          </span>
          <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('vi-VN')}</time>
        </li>
      ))}
    </ol>
  );
}
