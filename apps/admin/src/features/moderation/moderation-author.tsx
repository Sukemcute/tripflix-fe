import { vi } from '@tripflix/i18n';
import styles from './moderation-author.module.css';

const text = vi.moderation.authorDetails;
export function ModerationAuthor({
  authorId,
  author,
  targetType,
}: {
  authorId: string;
  author?: { displayName: string; email: string } | null;
  targetType: 'post' | 'comment';
}) {
  const title = targetType === 'comment' ? text.commentAuthor : text.postAuthor;
  return (
    <section className={styles.panel} aria-label={title}>
      <h3>{title}</h3>
      <dl className={styles.fields}>
        <div>
          <dt>{text.displayName}</dt>
          <dd>{author?.displayName || text.accountUnavailable}</dd>
        </div>
        <div>
          <dt>{text.email}</dt>
          <dd>{author?.email || text.unavailable}</dd>
        </div>
        <div className={styles.identifier}>
          <dt>{text.accountId}</dt>
          <dd>
            <code>{authorId}</code>
          </dd>
        </div>
      </dl>
    </section>
  );
}
