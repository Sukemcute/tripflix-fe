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
        {days.map((date) => {
          const price = prices.get(date);
          const isSelected = date === search.date;
          return (
            <li key={date}>
              <Link
                href={hrefFor(date)}
                scroll={false}
                aria-current={isSelected ? 'date' : undefined}
                data-cheapest={(price != null && price === lowest) || undefined}
              >
                <span className={styles.stripWeekday}>
                  {weekdayOf(date)}, {date.slice(8, 10)}/{date.slice(5, 7)}
                </span>
                <strong>
                  {calendar.data === undefined
                    ? '…'
                    : price != null
                      ? t('flights.millions', { value: millionFormatter.format(price / 1_000_000) })
                      : copy.noFlightsDay}
                </strong>
                {price != null && price === lowest && <small>{copy.cheapest}</small>}
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
