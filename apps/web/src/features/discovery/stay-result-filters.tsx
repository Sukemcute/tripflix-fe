import type { StayFilters } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import styles from './hotel-listing.module.css';
import { StayPriceInput } from './stay-price-input';
import { StaySearchIcon } from './stay-search-icon';

export const DEFAULT_STAY_FACETS = {
  priceMin: '',
  priceMax: '',
  minStars: '',
  sort: 'price',
} as const;

type StayFacets = Pick<StayFilters, keyof typeof DEFAULT_STAY_FACETS>;

const budgets = [
  { label: vi.ota.budgetUnderMillion, priceMin: '', priceMax: '999999' },
  { label: vi.ota.budgetOneToThreeMillion, priceMin: '1000000', priceMax: '3000000' },
  { label: vi.ota.budgetOverThreeMillion, priceMin: '3000001', priceMax: '' },
];
const starOptions = ['', '1', '2', '3', '4', '5'];
const sorts = [
  { value: 'price', label: vi.ota.lowerPrice },
  { value: 'stars', label: vi.ota.higherStars },
] as const;

export function StayResultFilters({
  filters,
  update,
  expanded,
  toggle,
  priceError,
  disabled,
  reset,
}: {
  filters: StayFacets;
  update: (patch: Partial<StayFacets>) => void;
  expanded: boolean;
  toggle: () => void;
  priceError?: string;
  disabled: boolean;
  reset: () => void;
}) {
  const { priceMin, priceMax, minStars, sort } = filters;
  const count = Number(Boolean(priceMin || priceMax)) + Number(Boolean(minStars)) + Number(sort !== 'price');
  const errorId = priceError ? 'stay-price-error' : undefined;
  return (
    <aside className={styles.filters} aria-labelledby="stay-filter-title">
      <header className={styles.filterHeader}>
        <span className={styles.filterIcon}>
          <StaySearchIcon name="filter" />
        </span>
        <div>
          <h2 id="stay-filter-title">{vi.ota.filterTitle}</h2>
          {count > 0 && <small>{t('ota.filterGroupsSelected', { count })}</small>}
        </div>
        <button
          type="button"
          className={styles.filterToggle}
          aria-label={vi.ota.filterTitle}
          aria-controls="stay-filter-controls"
          aria-expanded={expanded}
          onClick={toggle}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>
      <div className={styles.filterBody} id="stay-filter-controls" data-expanded={expanded}>
        <div className={styles.filterGroups}>
          <fieldset className={styles.filterGroup}>
            <legend>{vi.ota.nightlyBudget}</legend>
            <div className={styles.budgetInputs}>
              <label>
                {vi.ota.priceFrom}
                <StayPriceInput
                  value={priceMin}
                  onChange={(value) => update({ priceMin: value })}
                  errorId={errorId}
                  form="stay-search-form"
                />
              </label>
              <label>
                {vi.ota.priceTo}
                <StayPriceInput
                  value={priceMax}
                  onChange={(value) => update({ priceMax: value })}
                  errorId={errorId}
                  form="stay-search-form"
                />
              </label>
            </div>
            {priceError && (
              <p className={styles.filterError} id={errorId} role="alert">
                {priceError}
              </p>
            )}
            <div className={styles.filterChoices}>
              {budgets.map(({ label, ...budget }) => {
                const selected = priceMin === budget.priceMin && priceMax === budget.priceMax;
                return (
                  <button
                    type="button"
                    key={label}
                    aria-pressed={selected}
                    onClick={() => update(selected ? { priceMin: '', priceMax: '' } : budget)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className={styles.filterGroup}>
            <legend>{vi.api.minStars}</legend>
            <div className={`${styles.filterChoices} ${styles.ratingChoices}`}>
              {starOptions.map((stars) => (
                <button
                  type="button"
                  key={stars}
                  aria-pressed={minStars === stars}
                  onClick={() => update({ minStars: stars })}
                >
                  {stars ? `${stars}${stars === '5' ? '' : '+'} ★` : vi.api.all}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.filterGroup}>
            <legend>{vi.demo.web.sort}</legend>
            <div className={`${styles.filterChoices} ${styles.sortChoices}`}>
              {sorts.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={sort === value}
                  onClick={() => update({ sort: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <footer className={styles.filterActions}>
          {count > 0 && (
            <button type="button" className={styles.clearFilters} onClick={reset}>
              {vi.ota.clearFilters}
            </button>
          )}
          <button className={styles.applyFilters} type="submit" form="stay-search-form" disabled={disabled}>
            {vi.ota.applyFilters}
          </button>
        </footer>
      </div>
    </aside>
  );
}
