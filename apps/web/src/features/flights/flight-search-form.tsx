'use client';

import { useFlightRoutes, type FlightSearch } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import styles from './flights.module.css';

const copy = vi.flights;
const airportNames: Readonly<Record<string, string>> = copy.airports;

export function FlightSearchForm({ initial, today }: { initial: FlightSearch | null; today: string }) {
  const routes = useFlightRoutes();
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const destinations = routes.data?.find((origin) => origin.airport === from)?.destinations ?? [];
  const canSearch = destinations.some((destination) => destination.code === to);

  return (
    <form action="/flights" method="get" className={styles.form}>
      <div className={styles.fields}>
        <label>
          {copy.from}
          <select
            name="from"
            aria-label={copy.from}
            required
            value={from}
            disabled={!routes.data?.length}
            onChange={(event) => {
              setFrom(event.target.value);
              setTo('');
            }}
          >
            <option value="">{copy.selectAirport}</option>
            {routes.data?.map(({ airport }) => (
              <option key={airport} value={airport}>
                {airportNames[airport] ? airport + ' · ' + airportNames[airport] : airport}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.to}
          <select
            name="to"
            aria-label={copy.to}
            required
            value={to}
            disabled={!destinations.length}
            onChange={(event) => setTo(event.target.value)}
          >
            <option value="">{from ? copy.selectAirport : copy.selectOriginFirst}</option>
            {destinations.map(({ code, name }) => (
              <option key={code} value={code}>
                {code} · {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.date}
          <input name="date" type="date" min={today} required defaultValue={initial?.date ?? today} />
        </label>
        <label>
          {copy.adults}
          <select name="passengers" aria-label={copy.adults} defaultValue={initial?.passengers ?? 1}>
            {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary-button" disabled={!canSearch}>
          {copy.search}
        </button>
      </div>
      {routes.isPending && <output className="small muted">{vi.api.loading}</output>}
      <ApiErrorNotice error={routes.error} retry={() => void routes.refetch()} />
      {routes.data?.length === 0 && <output className="small muted">{copy.noRoutes}</output>}
    </form>
  );
}
