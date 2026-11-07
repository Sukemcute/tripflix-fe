'use client';

import { getFlightToday, useFlightCalendar, type FlightSearch } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useState } from 'react';
import { FlightIcon } from './flight-icon';
import styles from './flights.module.css';

const copy = vi.flights;
const WEEKDAYS = copy.weekdays.split(' ');
const STRIP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const millionFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

const addDays = (iso: string, days: number) =>
  new Date(new Date(iso + 'T00:00:00Z').getTime() + days * DAY_MS).toISOString().slice(0, 10);
const weekdayOf = (iso: string) => WEEKDAYS[(new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7];

/** 7 ngày quanh ngày đang tìm, mỗi ngày kèm giá rẻ nhất; bấm để đổi ngày bay. */
export function FlightDateStrip({ search }: { search: FlightSearch }) {
  const today = getFlightToday();
  const centered = addDays(search.date, -3);
  const [start, setStart] = useState(centered < today ? today : centered);
  const end = addDays(start, STRIP_DAYS - 1);
  const calendar = useFlightCalendar({
    from: search.from,
    to: search.to,
    start,
    end,
    passengers: search.passengers,
  });
  const days = Array.from({ length: STRIP_DAYS }, (_, index) => addDays(start, index));
  const prices = new Map(calendar.data?.map((day) => [day.date, day.isAvailable ? day.priceFrom : null]));
  const available = [...prices.values()].filter((price): price is number => price != null);
  const lowest = available.length ? Math.min(...available) : null;
  const highest = available.length ? Math.max(...available) : null;
  // Độ cao của chấm giá trên đường biểu đồ (px, 0–10): ngày đắt nhất cao nhất.
  const lift = (price: number) =>
    lowest == null || highest == null || highest === lowest
      ? 5
      : Math.round(((price - lowest) / (highest - lowest)) * 10);
  const linePoints = days
    .map((date, index) => {
      const price = prices.get(date);
      return price != null ? `${index + 0.5},${13 - lift(price)}` : null;
    })
    .filter(Boolean)
    .join(' ');

  const hrefFor = (date: string) =>
    '/flights?' +
    new URLSearchParams({
      from: search.from,
      to: search.to,
      date,
      passengers: String(search.passengers),
      ...(search.sort ? { sort: search.sort } : {}),
    });

  return (
    <nav className={styles.dateStrip} aria-label={copy.datesLabel}>
      <button
        type="button"
        className={styles.stripArrow}
        aria-label={copy.previousDays}
        disabled={start <= today}
        onClick={() => {
          const previous = addDays(start, -STRIP_DAYS);
          setStart(previous < today ? today : previous);
        }}
      >
        <FlightIcon name="chevron" size={18} />
      </button>
      <ol className={styles.stripDays} aria-busy={calendar.isFetching || undefined}>
        {linePoints && (
          <svg className={styles.stripLine} viewBox={`0 0 ${STRIP_DAYS} 16`} preserveAspectRatio="none" aria-hidden="true">
            <polyline points={linePoints} />
          </svg>
        )}
        {days.map((date) => {
          const price = prices.get(date);
          const isSelected = date === search.date;
          const isCheapest = price != null && price === lowest;
          const isLoading = calendar.data === undefined;
          return (
            <li key={date}>
              <Link
                href={hrefFor(date)}
                scroll={false}
                aria-current={isSelected ? 'date' : undefined}
                data-cheapest={isCheapest || undefined}
                data-empty={(!isLoading && price == null) || undefined}
                title={isCheapest ? copy.cheapest : undefined}
              >
                <span className={styles.stripDate}>
                  {weekdayOf(date)} · {date.slice(8, 10)}/{date.slice(5, 7)}
                </span>
                <strong>
                  {isLoading
                    ? '…'
                    : price != null
                      ? t('flights.millions', { value: millionFormatter.format(price / 1_000_000) })
                      : copy.noFlightsDay}
                </strong>
                {isCheapest && <span className={styles.srOnly}>{copy.cheapest}</span>}
                {price != null && (
                  <span className={styles.stripDot} style={{ bottom: 9 + lift(price) }} aria-hidden="true" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={styles.stripArrow}
        aria-label={copy.nextDays}
        onClick={() => setStart(addDays(start, STRIP_DAYS))}
      >
        <FlightIcon name="chevron" size={18} />
      </button>
    </nav>
  );
}
