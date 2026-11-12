'use client';
import { HttpError } from '@tripflix/api-client';
import { ApiErrorNotice } from '@/features/shared/api-state';
import styles from './checkout.module.css';

/**
 * Lỗi nghiệp vụ của commerce (4xx) và 503 có message tiếng Việt từ backend; lỗi khác dùng thông báo chung.
 * 500 mặc định của Nest có message tiếng Anh "Internal server error" nên không hiện nguyên văn.
 */
export function CheckoutError({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  if (error instanceof HttpError && (error.status < 500 || error.status === 503) && error.body && typeof error.body === 'object' && 'message' in error.body) {
    const body = error.body as { message?: unknown };
    if (typeof body.message === 'string')
      return (
        <p role="alert" className={styles.error}>
          {body.message}
        </p>
      );
  }
  return <ApiErrorNotice error={error} retry={retry} />;
}
