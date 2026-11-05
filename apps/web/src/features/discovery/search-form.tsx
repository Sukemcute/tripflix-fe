'use client';

import { vi } from '@tripflix/i18n';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { StaySearchIcon } from './stay-search-icon';
import styles from './stay-search.module.css';
import own from './search-form.module.css';

/**
 * Thanh tìm bài viết ở trang Cảm hứng, cùng kiểu với khung tìm khách sạn ở trang chủ (stay-search.module.css):
 * thẻ dịch vụ + câu dẫn, ô có biểu tượng và nhãn nhỏ, nút teal, thanh công cụ (gợi ý) bên dưới.
 * Tìm ngay trên trang: /inspiration?q=<từ khoá>#trips (không có JS thì form GET tới cùng địa chỉ).
 */
export function SearchForm({
  query = '',
  compact = false,
  footer,
}: {
  query?: string;
  compact?: boolean;
  /** Nội dung bên phải thanh công cụ, ví dụ thẻ gợi ý. */
  footer?: ReactNode;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [submitted, setSubmitted] = useState<string | null>(null);
  // Đang chờ trang tải kết quả: từ khoá đã gửi khác từ khoá trang đang hiện.
  const isPending = submitted !== null && submitted !== query;
  return (
    <form
      action="/inspiration"
      method="get"
      className={`search-form ${styles.panel} ${compact ? 'compact-search' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        const keyword = value.trim();
        setSubmitted(keyword);
        router.push(keyword ? `/inspiration?q=${encodeURIComponent(keyword)}#trips` : '/inspiration#trips');
      }}
    >
      <div className={styles.heading}>
        <span className={styles.service}>
          <StaySearchIcon name="place" />
          {vi.api.inspiration}
        </span>
        <span className={styles.headingHint}>{vi.demo.web.body}</span>
      </div>
      <div className={`${styles.searchRow} ${own.row}`}>
        <label className={`${styles.field} ${styles.placeField}`} htmlFor="trip-query">
          <StaySearchIcon name="search" />
          <span className={styles.fieldContent}>
            <span>{vi.api.searchWhere}</span>
            <input
              id="trip-query"
              name="q"
              type="search"
              value={value}
              minLength={2}
              maxLength={100}
              placeholder={vi.api.searchShortPlaceholder}
              aria-describedby="trip-query-hint"
              onChange={(event) => setValue(event.target.value)}
            />
          </span>
        </label>
        <button className={`primary-button ${styles.submit}`} type="submit" disabled={isPending}>
          <StaySearchIcon name="search" />
          {isPending ? vi.api.searchPostsBusy : vi.api.searchPostsButton}
        </button>
      </div>
      <div className={`${styles.toolbar} ${own.toolbar}`}>
        <p id="trip-query-hint">{vi.api.searchPostsHint}</p>
        {footer}
      </div>
    </form>
  );
}
