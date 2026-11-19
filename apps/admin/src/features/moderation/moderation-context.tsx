import { vi } from '@tripflix/i18n';
import type {
  ModerationPostContextDto,
  ModerationParentCommentDto,
} from '@tripflix/api-client/core-api/model/index';
import styles from './moderation-context.module.css';

const text = vi.moderation.context;
const unavailable = vi.moderation.authorDetails.accountUnavailable;
const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3100').replace(/\/+$/, '');
export function ModerationContext({
  postId,
  commentId,
  post,
  parent,
  commentStatus,
}: {
  postId: string;
  commentId: string;
  post?: ModerationPostContextDto | null;
  parent?: ModerationParentCommentDto | null;
  commentStatus?: string;
}) {
  const canOpen = post && !post.unavailable && post.status === 'published' && post.visibility === 'public';
  const status = post ? (text.statuses[post.status as keyof typeof text.statuses] ?? post.status) : null;
  const visibility = post
    ? (text.visibilities[post.visibility as keyof typeof text.visibilities] ?? post.visibility)
    : null;
  return (
    <section className={styles.panel} aria-label={text.title}>
      <h3>{text.title}</h3>
      <h4>{!post ? text.missing : post.unavailable ? text.deleted : post.title?.trim() || text.untitled}</h4>
      {post?.excerpt && !post.unavailable && <p className={styles.excerpt}>{post.excerpt}</p>}
      <dl className={styles.fields}>
        <div>
          <dt>{text.owner}</dt>
          <dd>{post?.author?.displayName || unavailable}</dd>
        </div>
        <div>
          <dt>{text.email}</dt>
          <dd>{post?.author?.email || vi.moderation.authorDetails.unavailable}</dd>
        </div>
        {post && (
          <>
            <div>
              <dt>{text.status}</dt>
              <dd>
                {status} · {visibility}
              </dd>
            </div>
            <div>
              <dt>{text.createdAt}</dt>
              <dd>
                <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString('vi-VN')}</time>
              </dd>
            </div>
            <div className={styles.identifier}>
              <dt>{text.accountId}</dt>
              <dd>
                <code>{post.authorId}</code>
              </dd>
            </div>
          </>
        )}
        <div className={styles.identifier}>
          <dt>{text.postId}</dt>
          <dd>
            <code>{post?.id ?? postId}</code>
          </dd>
        </div>
      </dl>
      {canOpen ? (
        <a
          className={styles.link}
          href={`${webUrl}/inspiration?${new URLSearchParams({ open: post.id, comment: commentId })}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {text.openPost} <span aria-hidden="true">↗</span>
        </a>
      ) : (
        post && !post.unavailable && <p className={styles.hint}>{text.nonPublic}</p>
      )}
      {canOpen && commentStatus && commentStatus !== 'visible' && (
        <p className={styles.hint}>{text.hiddenComment}</p>
      )}
      {parent && (
        <blockquote className={styles.parent}>
          <h4>{parent.kind === 'reply' ? text.reply : text.thread}</h4>
          <p>
            {text.commentAuthor}: <strong>{parent.author?.displayName || unavailable}</strong>
            {parent.author?.email ? ` · ${parent.author.email}` : ''}
          </p>
          <p className={styles.excerpt}>{parent.unavailable ? text.unavailableComment : parent.body}</p>
          <code>{parent.id}</code>
        </blockquote>
      )}
    </section>
  );
}
