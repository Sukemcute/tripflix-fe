'use client';

import { t, vi } from '@tripflix/i18n';
import styles from './reply-quote.module.css';

const QUOTE_HIGHLIGHT_MS = 1_500;
const highlightTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Chỉ hiện khung trích dẫn cho reply trả lời vào một reply khác trong luồng;
 * trả lời thẳng bình luận gốc (hoặc reply cũ chưa có replyToCommentId) thì không cần khung.
 */
export function shouldShowReplyQuote({
  isReply,
  parentCommentId,
  replyToCommentId,
}: {
  isReply: boolean;
  parentCommentId?: string | null;
  replyToCommentId?: string | null;
}): boolean {
  return Boolean(isReply && replyToCommentId && parentCommentId && replyToCommentId !== parentCommentId);
}

/**
 * Cuộn tới bình luận được trích dẫn CHỈ bên trong khung cuộn của panel bình luận (không cuộn cả trang)
 * và tô sáng nhẹ khoảng 1,5 giây. Nếu câu đích chưa tải trong panel thì bỏ qua.
 */
export function scrollToQuotedComment(
  scrollContainer: HTMLElement | null,
  targetCommentId: string,
): boolean {
  if (!scrollContainer) return false;
  const escapedId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(targetCommentId)
      : targetCommentId.replace(/"/g, '\\"');
  const target = scrollContainer.querySelector<HTMLElement>(`[data-comment-id="${escapedId}"]`);
  if (!target) return false;

  if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
    const targetRect = target.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const offsetTop =
      scrollContainer.scrollTop +
      (targetRect.top - containerRect.top) -
      (scrollContainer.clientHeight - target.clientHeight) / 2;
    scrollContainer.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
  }

  const prevTimer = highlightTimers.get(target);
  if (prevTimer) clearTimeout(prevTimer);
  target.setAttribute('data-quote-highlighted', 'true');
  const timer = setTimeout(() => {
    target.removeAttribute('data-quote-highlighted');
    highlightTimers.delete(target);
  }, QUOTE_HIGHLIGHT_MS);
  highlightTimers.set(target, timer);
  return true;
}

export interface ReplyQuoteProps {
  replyToCommentId: string;
  replyToName?: string | null;
  replyToExcerpt: string | null;
  onJump?: (commentId: string) => void;
}

export function ReplyQuote({
  replyToCommentId,
  replyToName,
  replyToExcerpt,
  onJump,
}: ReplyQuoteProps) {
  const title = t('api.commentReplyQuoteTitle', {
    name: replyToName?.trim() || vi.api.commentMember,
  });
  const isAvailable = replyToExcerpt !== null && replyToExcerpt.length > 0;

  const content = (
    <>
      <span className={styles.quoteTitle}>{title}</span>
      {isAvailable ? (
        <p className={styles.quoteExcerpt}>{replyToExcerpt}</p>
      ) : (
        <p className={styles.quoteUnavailable}>{vi.api.commentQuoteUnavailable}</p>
      )}
    </>
  );

  if (!isAvailable) {
    return <div className={styles.quoteCard}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={`${styles.quoteCard} ${styles.quoteCardClickable}`}
      onClick={() => onJump?.(replyToCommentId)}
    >
      {content}
    </button>
  );
}
