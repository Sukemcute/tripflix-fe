import Link from 'next/link';
import { vi } from '@tripflix/i18n';
import styles from './comment-visibility.module.css';

export function ModeratedComment() {
  return (
    <div className={styles.moderated}>
      <p>{vi.api.commentModerationHidden}</p>
      <Link prefetch={false} href="/account/moderation">{vi.api.commentModerationLearnMore}</Link>
    </div>
  );
}
