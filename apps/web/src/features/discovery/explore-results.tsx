'use client';
import { useExploreSearch, type ExploreItemDto, type ExploreUnderstoodDto } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { getPostCover, POST_COVER_MASCOT } from '@/features/social/post-cover';
import styles from './explore-results.module.css';
import { StayThumbnail } from './stay-thumbnail';
import { formatPrice } from './trip-card';

/** Kết quả tìm khám phá (POST /api/search) cho trang Cảm hứng: câu đã hiểu + các vùng có kết quả. */
export function ExploreResults({ query }: { query: string }) {
  const search = useExploreSearch(query);
  const result = search.data;
  const sections = result?.sections.filter((section) => section.total > 0) ?? [];
  return (
    <>
      <ApiErrorNotice
        error={search.error}
        retry={() => {
          void search.refetch();
        }}
      />
      {search.isPending && <output>{vi.api.loading}</output>}
      {result && <Understood understood={result.understood} isNearUser={result.nearUser} />}
      {result && result.dropped.length > 0 && (
        <p className="small muted">{t('api.exploreDropped', { words: result.dropped.join(', ') })}</p>
      )}
      {sections.map((section) => (
        <section key={section.kind} className={styles.section} aria-label={section.label}>
          <h3 className={styles.sectionTitle}>
            {section.label} <span className="muted">{section.total}</span>
          </h3>
          <div className="trip-grid">
            {section.items.map((item) => (
              <ExploreCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
      {result && sections.length === 0 && result.suggest.length > 0 && (
        <section className={styles.section}>
          <p className="muted">{vi.api.exploreSuggest}</p>
          <div className="trip-grid">
            {result.suggest.map((item) => (
              <ExploreCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
      {result && sections.length === 0 && result.suggest.length === 0 && (
        <p className="empty-state">{t('api.exploreEmpty', { query })}</p>
      )}
    </>
  );
}

function Understood({ understood, isNearUser }: { understood: ExploreUnderstoodDto; isNearUser: boolean }) {
  const chips = [
    understood.place,
    isNearUser ? vi.api.exploreNearUser : null,
    understood.budget ? t('api.exploreBudget', { amount: formatPrice(understood.budget) }) : null,
    understood.days ? t('api.exploreDays', { days: understood.days }) : null,
    ...understood.names,
    ...Object.entries(understood.fixed).map(([from, to]) => t('api.exploreFixed', { from, to: String(to) })),
  ].filter((chip): chip is string => !!chip);
  if (!chips.length) return null;
  return (
    <p className={styles.understood}>
      <span>{vi.api.exploreUnderstood}</span>
      {chips.map((chip) => (
        <span key={chip} className={styles.chip}>
          {chip}
        </span>
      ))}
    </p>
  );
}

function ExploreCard({ item }: { item: ExploreItemDto }) {
  const isStay = item.kind === 'stay';
  const href = isStay ? `/hotels/${encodeURIComponent(item.refId)}` : `/trips/${item.refId}`;
  const cover = getPostCover(item.subtitle ?? undefined);
  const price = item.priceFrom
    ? t(isStay ? 'api.exploreFromPerNight' : 'api.exploreCostPerPerson', { price: formatPrice(item.priceFrom) })
    : null;
  return (
    <article className="trip-card">
      <Link className="trip-card-link" href={href}>
        {isStay ? (
          <StayThumbnail url={item.thumbnail} name={item.title} />
        ) : (
          <div className="trip-card-photo">
            {cover ? (
              <Image src={cover} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" />
            ) : (
              <Image src={POST_COVER_MASCOT} alt="" width={140} height={140} className={styles.mascot} />
            )}
          </div>
        )}
        <p className="eyebrow">{item.subtitle}</p>
        <h3>{item.title}</h3>
        <p className="trip-card-summary">{item.reason}</p>
        {price && (
          <div className="trip-card-bottom">
            <strong>{price}</strong>
          </div>
        )}
      </Link>
    </article>
  );
}
