'use client';

import { vi } from '@tripflix/i18n';
import { useState } from 'react';

/** Thanh tìm kiếm trang Cảm hứng: ô nhập và nút nằm trong một thanh liền, gửi GET /search?q=. */
export function SearchForm({ query = '', compact = false }: { query?: string; compact?: boolean }) {
  const copy = vi.demo.web;
  const [isPending, setPending] = useState(false);
  return (
    <form
      action="/search"
      method="get"
      className={`search-form ${compact ? 'compact-search' : ''}`}
      onSubmit={() => setPending(true)}
    >
      <label htmlFor="trip-query">{vi.api.searchWhere}</label>
      <div className="search-field">
        <svg className="search-field-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id="trip-query"
          name="q"
          type="search"
          defaultValue={query}
          minLength={2}
          maxLength={100}
          placeholder={vi.api.searchShortPlaceholder}
          aria-describedby="trip-query-hint"
        />
        <button className="primary-button" type="submit" disabled={isPending}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <span className="search-submit-label">{isPending ? copy.searchBusy : copy.searchButton}</span>
        </button>
      </div>
      <p className="small muted" id="trip-query-hint">
        {vi.api.searchMinChars}
      </p>
    </form>
  );
}
