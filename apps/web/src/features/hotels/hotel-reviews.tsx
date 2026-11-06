'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHotelReviews, useApiSession, type HotelReviewFilters } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { HotelGallery } from './hotel-gallery';
import styles from './hotel.module.css';

const copy = vi.hotel;
const formatDate = (date: string, monthOnly = false) =>
  new Intl.DateTimeFormat(
    'vi-VN',
    monthOnly
      ? { month: '2-digit', year: 'numeric', timeZone: 'UTC' }
      : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' },
  ).format(new Date(date));

export function HotelReviews({ id }: { id: string }) {
  const { isReady } = useApiSession();
  const [filters, setFilters] = useState<HotelReviewFilters>({ sort: 'newest', page: 1, limit: 5 });
  const query = useQuery({
    queryKey: ['hotels', id, 'reviews', filters],
    enabled: isReady,
    queryFn: ({ signal }) => getHotelReviews(id, filters, signal),
  });
  const updateFilters = (next: Partial<HotelReviewFilters>) =>
    setFilters((previous) => ({ ...previous, ...next, page: 1 }));
  const summary = query.data?.summary;
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;
  return (
    <section id="reviews" className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2>{copy.reviews}</h2>
        {summary && (
          <span>
            {t('hotel.reviewCount', { count: summary.count })} · {copy.tripflix}
          </span>
        )}
      </div>
      {summary && summary.count > 0 && (
        <div className={styles.reviewOverview}>
          <div className={styles.reviewScore}>
            <strong>{summary.average?.toLocaleString('vi-VN')}</strong>
            <span>{copy.outOfFive}</span>
            <p>{t('hotel.reviewCount', { count: summary.count })}</p>
          </div>
          <div className={styles.distribution}>
            {summary.distribution.map((level) => (
              <div key={level.rating}>
                <span>{level.rating} ★</span>
                <meter
                  value={level.count}
                  max={summary.count}
                  aria-label={`${level.rating} ★: ${level.count}`}
                />
                <span>{level.count}</span>
              </div>
            ))}
          </div>
          {summary.aiSummary && (
            <div className={styles.reviewSummary}>
              <h3>{copy.reviewSummary}</h3>
              <p>{summary.aiSummary}</p>
              <small>{copy.reviewSummaryHint}</small>
            </div>
          )}
        </div>
      )}
      <div className={styles.reviewFilters}>
        <label>
          {copy.sort}
          <select
            aria-label={copy.sort}
            value={filters.sort}
            onChange={(event) => updateFilters({ sort: event.target.value as HotelReviewFilters['sort'] })}
          >
            {(['newest', 'highest', 'lowest', 'helpful'] as const).map((key) => (
              <option key={key} value={key}>
                {copy[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.rating}
          <select
            aria-label={copy.rating}
            value={filters.rating ?? ''}
            onChange={(event) =>
              updateFilters({ rating: event.target.value ? Number(event.target.value) : undefined })
            }
          >
            <option value="">{copy.allRatings}</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} ★
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.traveler}
          <select
            aria-label={copy.traveler}
            value={filters.travelerType ?? ''}
            onChange={(event) =>
              updateFilters({
                travelerType: (event.target.value || undefined) as HotelReviewFilters['travelerType'],
              })
            }
          >
            <option value="">{copy.allTravelers}</option>
            {Object.entries(copy.travelerTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {summary && summary.tags.length > 0 && (
        <div className={styles.chips} aria-label={copy.allTags}>
          <button
            className="secondary-button"
            aria-pressed={!filters.tag}
            onClick={() => updateFilters({ tag: undefined })}
          >
            {copy.allTags}
          </button>
          {summary.tags.map(({ tag, count }) => (
            <button
              className="secondary-button"
              key={tag}
              aria-pressed={filters.tag === tag}
              onClick={() => updateFilters({ tag: filters.tag === tag ? undefined : tag })}
            >
              {tag} <span>{count}</span>
            </button>
          ))}
        </div>
      )}
      <ApiErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isFetching && <output>{copy.loadingReviews}</output>}
      {query.data?.items.length === 0 && (
        <div className="empty-state">
          <p>{summary?.count ? copy.noMatchingReviews : copy.noReviews}</p>
          {(filters.rating || filters.tag || filters.travelerType) && (
            <button
              className="secondary-button"
              onClick={() => setFilters({ sort: 'newest', page: 1, limit: 5 })}
            >
              {copy.clearFilters}
            </button>
          )}
        </div>
      )}
      <div aria-busy={query.isFetching}>
        {query.data?.items.map((review) => (
          <article key={review.id} className={styles.review}>
            <div className={styles.reviewAuthor}>
              <span className={styles.avatar} aria-hidden="true">
                {review.authorName
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((part) => part[0])
                  .join('')}
              </span>
              <div>
                <strong>{review.authorName}</strong>
                <p>
                  {review.travelerType &&
                    (copy.travelerTypes[review.travelerType as keyof typeof copy.travelerTypes] ??
                      review.travelerType)}
                </p>
                {review.stayMonth && (
                  <small>
                    {copy.stayed}: {formatDate(review.stayMonth, true)}
                  </small>
                )}
                {review.room && <p className="small muted">{review.room.name}</p>}
              </div>
            </div>
            <div className={styles.reviewBody}>
              <div className={styles.reviewTop}>
                <span className={styles.stars} aria-label={`${review.rating} / 5`}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </span>
                <time dateTime={review.createdAt}>
                  {copy.written}: {formatDate(review.createdAt)}
                </time>
              </div>
              {review.title && <h3>{review.title}</h3>}
              <p>{review.body}</p>
              {review.tags.length > 0 && (
                <div className={styles.chips}>
                  {review.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              <HotelGallery images={review.images} name={review.title ?? review.authorName} layout="compact" />
              {review.helpfulCount > 0 && (
                <p className="small muted">{t('hotel.helpfulCount', { count: review.helpfulCount })}</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {query.data && query.data.total > 0 && (
        <nav className={styles.pagination} aria-label={copy.reviews}>
          <button
            className="secondary-button"
            disabled={query.isFetching || (filters.page ?? 1) <= 1}
            onClick={() => setFilters((previous) => ({ ...previous, page: (previous.page ?? 1) - 1 }))}
          >
            {copy.previous}
          </button>
          <span aria-live="polite">{t('hotel.page', { page: query.data.page, pages: pageCount })}</span>
          <button
            className="secondary-button"
            disabled={query.isFetching || (filters.page ?? 1) >= pageCount}
            onClick={() => setFilters((previous) => ({ ...previous, page: (previous.page ?? 1) + 1 }))}
          >
            {copy.next}
          </button>
        </nav>
      )}
    </section>
  );
}
