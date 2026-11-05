'use client';

import { vi } from '@tripflix/i18n';
import { useState } from 'react';

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
      <label htmlFor="trip-query">{vi.api.search}</label>
      <div className="search-field">
        <input
          id="trip-query"
          name="q"
          defaultValue={query}
          maxLength={100}
          placeholder={vi.api.searchHint}
        />
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? copy.searchBusy : copy.searchButton}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className="small muted">{vi.api.searchHint}</p>
    </form>
  );
}
